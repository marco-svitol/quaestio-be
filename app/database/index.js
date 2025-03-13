const logger=require('../logger'); 
const sqlConfigPool = global.config_data.sqlConfigPool;
const sql = require('mssql');

const getuserProfile = `
SELECT
logopath AS "userinfo.logopath",
JSON_QUERY(
  (
    SELECT
      (
        SELECT id, name
        FROM OPENJSON(query_mapping, '$.applicants')
        WITH (id VARCHAR(10) '$.id', name VARCHAR(100) '$.name')
        FOR JSON PATH
      ) AS applicants,
      (
        SELECT id, name
        FROM OPENJSON(query_mapping, '$.tecareas')
        WITH (id VARCHAR(10) '$.id', name VARCHAR(100) '$.name')
        FOR JSON PATH
      ) AS tecareas
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
  )
) AS searchvalues,
(
  SELECT
    bmfolderid as id,
    bmfoldername as name,
    bmfolderscope as scope
  FROM bookmarksfolders
  WHERE uid = @uid
  FOR JSON PATH
) AS "bmfolders"
FROM [orgsprofile]
JOIN query_mappings ON orgsprofile.query_mapping_id = query_mappings.id
WHERE org_id = @org_id
FOR JSON PATH;
`

const pool = new sql.ConnectionPool(sqlConfigPool);
const poolConnect = pool.connect()
  .catch(err => {
		logger.error(`DB connection to ${sqlConfigPool.server}/${sqlConfigPool.database}: `, err)
		process.exit(1);
	})
	.then(function(conn) {  //create SQL connection pool
		logger.info(`Connected to ${sqlConfigPool.database} DB with user ${sqlConfigPool.user}. Concurrent connection limit (pool) : ${sqlConfigPool.connectionLimit}` );
	})


module.exports.poolrequest = async function(){
	await poolConnect;
	return pool.request();
}

module.exports._userprofile = async function(uid, org_id){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('org_id', sql.Int, org_id);
  const strQuery = `
  DECLARE @USER_EXISTS INT;

  SELECT @USER_EXISTS = COUNT(*)
  FROM usersprofile
  WHERE uid = @uid;

  IF @USER_EXISTS > 0
  BEGIN
  ${getuserProfile}
  END
  ELSE
  BEGIN
    INSERT INTO usersprofile (uid, userpreferences)
    SELECT @uid, userpreferences
    FROM usersprofile
    WHERE uid = 'guest';
  END

  `;
  try{
    const qResult = await dbRequest.query(strQuery);
    const rows = qResult.recordset;
    if (rows.length > 0){
        if (rows[0] != null){
          return (null,{success: true, userprofile: rows[0]});
        }
    } 
    return (null,{success: false, message: "Userprofile not found"});
  }catch(err){
    return (err,{success: false, message: "DB error"});
  }

}

//TODO: update to new table version
module.exports._createuserprofile = async function(uid, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  const strQuery = `
    INSERT INTO usersprofile (uid, searchValues, _name_)
    SELECT @uid, searchvalues, 'guest'
    FROM usersprofile
    WHERE uid = 'guest';
    
  `;

  dbRequest.query(strQuery)
  .then(() => {
    next(null,{success: true, message: `Userprofile with uid ${uid} created`});
  })
  .catch(err => {
    next(err,{success: false, message: "DB error"});
  })

}

// module.exports._updatehistory = async function(uid, docid, familyid, status, next){
//   const dbRequest = await this.poolrequest();
//   dbRequest.input('uid', sql.VarChar(50), uid);
//   dbRequest.input('docid', sql.NVarChar, docid);
//   dbRequest.input('familyid', sql.Int, familyid);
//   dbRequest.input('status', sql.Int, status);
//   const strQuery = `
// BEGIN TRANSACTION
// IF NOT EXISTS (SELECT 1 FROM dochistory WHERE uid = @uid AND docid = @docid)  
// BEGIN  
//   INSERT INTO dochistory (uid, docid, bookmark, docmetadata, bmfolderid, familyid) VALUES (@uid, @docid, 0, '', null, @familyid)	
// END

// IF EXISTS (SELECT 1 FROM familyhistory WHERE uid = @uid AND familyid = @familyid)
// BEGIN
//   UPDATE familyhistory
//   SET status = @status
//   WHERE familyid = @familyid AND uid = @uid
// END
// ELSE
// BEGIN
//   INSERT INTO familyhistory (uid, familyid, status) VALUES (@uid, @familyid, @status)
// END
// COMMIT TRANSACTION
// `
//   dbRequest.query(strQuery)
//     .then(() => {
//       next(null);
//     })
//     .catch(err => {
//       next(err);
//     })
// }

module.exports._docStatus = async function(uid, familyid, status, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('familyid', sql.Int, familyid);
  dbRequest.input('status', sql.Int, status);
  const strQuery = `
BEGIN TRANSACTION
IF EXISTS (SELECT 1 FROM familyhistory WHERE uid = @uid AND familyid = @familyid)
BEGIN
  UPDATE familyhistory
  SET status = @status
  WHERE familyid = @familyid AND uid = @uid
END
ELSE
BEGIN
  INSERT INTO familyhistory (uid, familyid, status) VALUES (@uid, @familyid, @status)
END
COMMIT TRANSACTION
`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._updatebookmark = async function(uid, docid, bookmark, bmfolderid, familyid, docmetadata = '', next){
  const dbRequest = await this.poolrequest();
  // Default bookmark folder id starts always with 00000000-
  // in dochistory table we don't set this bmfolder id, but replace it with null.
  // Reason is: to maintain the MSSQL automation that when you remove a bmfolder row also the dochistory bmfolderid
  //            is set to null 
  if (bmfolderid){
    bmfolderid = bmfolderid.substring(0, 9) === '00000000-' ? null : bmfolderid;  
  }
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('docid', sql.NVarChar, docid);
  dbRequest.input('bookmark', sql.Bit, bookmark);
  dbRequest.input('bmfolderid',sql.VarChar(36), bmfolderid);
  dbRequest.input('docmetadata', sql.NVarChar, docmetadata);
  dbRequest.input('familyid', sql.Int, familyid);
  const strQuery = `
DECLARE @actual_bmfolderid VARCHAR(36);

IF EXISTS (SELECT 1 FROM bookmarksfolders WHERE bmfolderid = @bmfolderid)
BEGIN
    SET @actual_bmfolderid = @bmfolderid;
END
ELSE
BEGIN
    SET @actual_bmfolderid = NULL;
END

IF EXISTS (SELECT 1 FROM dochistory WHERE uid = @uid AND docid = @docid)  
BEGIN
	UPDATE dochistory   
	SET bookmark = @bookmark, docmetadata = @docmetadata, bmfolderid = @actual_bmfolderid
	WHERE uid = @uid AND docid = @docid;
END  
ELSE  
BEGIN  
	  INSERT INTO dochistory (uid, docid, bookmark, docmetadata, bmfolderid, familyid) VALUES (@uid, @docid, 1, @docmetadata, @actual_bmfolderid, @familyid)
END`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._updatenotes = async function(uid, familyid, notes, status, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('familyid', sql.Int, familyid);
  dbRequest.input('status', sql.Int, status);
  dbRequest.input('notes', sql.NVarChar, notes);
  const strQuery = `
IF EXISTS (SELECT 1 FROM familyhistory WHERE uid = @uid AND familyid = @familyid)  
  BEGIN
    UPDATE familyhistory   
    SET notes = @notes
    WHERE uid = @uid AND familyid = @familyid;  
  END  
  ELSE  
  BEGIN  
      INSERT INTO familyhistory (uid, familyid, status, notes) VALUES (@uid, @familyid, @status, @notes)
  END
`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._updatebmfolder = async function(uid, bmfolderid, bmfoldername){
  if (bmfolderid.substring(0, 9) === '00000000-'){
    // Raise error with HTTP status 403 and message "can't modify default bookmark folder"
    const error = new Error(`can't modify or delete default bookmark folder ${bmfolderid}`);
    error.status = 403; // HTTP status 403 Forbidden
    throw (error);
  }

  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('bmfolderid', sql.VarChar(36), bmfolderid);
  dbRequest.input('bmfoldername', sql.VarChar(256), bmfoldername);
  const strQuery = `
  DECLARE @ActionTaken NVARCHAR(50);
  DECLARE @NewBMFolderID UNIQUEIDENTIFIER;
  
  CREATE TABLE #ActionTaken (Action NVARCHAR(50), NewBMFolderID UNIQUEIDENTIFIER);
  
  SET @NewBMFolderID = NEWID();

  MERGE INTO bookmarksfolders AS target
  USING (SELECT @uid AS uid, @bmfolderid AS bmfolderid, @bmfoldername AS bmfoldername) AS source
  ON target.uid = source.uid AND target.bmfolderid = source.bmfolderid
  WHEN MATCHED AND source.bmfoldername = '' THEN
      DELETE
  WHEN MATCHED THEN
      UPDATE SET bmfoldername = source.bmfoldername
  WHEN NOT MATCHED AND (source.bmfolderid IS NULL OR source.bmfolderid = '') AND (source.bmfoldername IS NOT NULL AND source.bmfoldername <> '') THEN
      INSERT (uid, bmfolderid, bmfoldername, bmfolderscope)
      VALUES (source.uid, @NewBMFolderID, source.bmfoldername, 'private')
  OUTPUT 
      $action AS Action,
      @NewBMFolderID AS NewBMFolderID
  INTO #ActionTaken;
  
  SELECT TOP 1 @ActionTaken = Action, @NewBMFolderID = NewBMFolderID FROM #ActionTaken;
  
  DROP TABLE #ActionTaken;
  
  SELECT @ActionTaken AS ActionTaken, CASE WHEN @ActionTaken = 'INSERT' THEN @NewBMFolderID ELSE @bmfolderid END AS NewBMFolderID;
  
  `;
  const dbresult = await dbRequest.query(strQuery);
  const result = { "action": dbresult.recordset[0].ActionTaken,
                    "bmfolderid": dbresult.recordset[0].NewBMFolderID
  };
  return(result);

}


module.exports._gethistory = async function(uid, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  const strQuery = `
  SELECT
	  f.familyid,
	  f.status,
	  f.notes
  FROM
	  familyhistory f
  WHERE
    f.uid = @uid;

  SELECT
	  d.docid,
    d.bookmark,
    CASE 
      WHEN d.bmfolderid IS NULL THEN 
        (SELECT bmfolderid 
        FROM bookmarksfolders 
        WHERE LEFT(bmfolderid,8) = '00000000' 
          AND uid = @uid) 
      ELSE 
        d.bmfolderid 
      END AS bmfolderid
  FROM
    dochistory d
  WHERE
    d.uid = @uid;
  `
  dbRequest.query(strQuery)
    .then(dbRequest => {
      let familyHistory = dbRequest.recordsets[0].length > 0 ? dbRequest.recordsets[0] : null;
      let docHistory = dbRequest.recordsets[1].length > 0 ? dbRequest.recordsets[1] : null;
      next(null,familyHistory, docHistory);
    })
    .catch(err => {
      next(err,null);
    })
}

module.exports._getQuery = async function(field, id, org_id){
  const dbRequest = await this.poolrequest();
  dbRequest.input('id', sql.Int, id);
  dbRequest.input('org_id', sql.Int, org_id);
  const strQuery = `
  SELECT JSON_VALUE(applicant.value, '$.query') AS query 
  FROM (
    SELECT query_mapping 
    FROM [orgsprofile]
    JOIN query_mappings ON orgsprofile.query_mapping_id = query_mappings.id
    WHERE org_id = @org_id
  ) as applicants
  CROSS APPLY OPENJSON(query_mapping, '$.${field}') AS applicant
  WHERE JSON_VALUE(applicant.value, '$.id') = @id;
`
  const qResult = await dbRequest.query(strQuery);
  if (qResult.recordset.length > 0){
    return (null, qResult.recordset[0].query); 
  }
  throw Error(`The query ${strQuery} returned no results.`);
}

module.exports._getbookmarks = async function(uid, queryParams, next){
  let whereClause = "";
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  if (typeof queryParams.doc_num === "string" && queryParams.doc_num.trim() !== "" && queryParams.doc_num.trim().toLowerCase() !== "undefined") {
		dbRequest.input('doc_num', sql.VarChar(50), queryParams.doc_num);
    whereClause = ` AND docid = @doc_num`;
	} else {
    const conditions = [];

		if (queryParams.bookmarkpa) {
      dbRequest.input('applicant', sql.VarChar(50), queryParams.bookmarkpa);
			conditions.push("JSON_VALUE(docmetadata, '$.applicant') = @applicant");
		}

		if (queryParams.pdfrom) {
			const queryDate = validateDateBookmark(queryParams.pdfrom, queryParams.pdto);
      if (queryDate){
        conditions.push( ` CONVERT(DATE, JSON_VALUE(docmetadata, '$.date'), 112) ${queryDate}`);
      }
		}

		if (conditions.length > 0) {
			whereClause = "AND " + conditions.join(" AND ");
		} 
  }

  const strQuery = `
  WITH CTE AS (
    SELECT 
        familyid,
        CASE WHEN docmetadata = '' THEN '{"doc_num": "' + docid +'", "type": "", "familyid": "", "country": "", "invention_title": "' + docid +'", "date": "", "abstract": "", "applicant": "", "inventor_name": "", "ops_link": ""}' ELSE docmetadata END AS docmetadata,
        docid,
        bookmark,
        bmfolderid
    FROM 
        dochistory 
    WHERE
      uid = @uid
  )

  SELECT
	docid AS doc_num,
    JSON_VALUE(docmetadata, '$.type') AS type,
    JSON_VALUE(docmetadata, '$.familyid') AS familyid,
    JSON_VALUE(docmetadata, '$.country') AS country,
    JSON_VALUE(docmetadata, '$.invention_title') AS invention_title,
    JSON_VALUE(docmetadata, '$.date') AS date,
    JSON_VALUE(docmetadata, '$.abstract') AS abstract,
    JSON_VALUE(docmetadata, '$.applicant') AS applicant,
    JSON_VALUE(docmetadata, '$.inventor_name') AS inventor_name,
    JSON_VALUE(docmetadata, '$.ops_link') AS ops_link,
    (SELECT status from familyhistory where CTE.familyid = familyid AND @uid = uid) as read_history,
    (SELECT notes from familyhistory where CTE.familyid = familyid AND @uid = uid) as notes,
    bookmark,
    CASE WHEN bmfolderid IS NULL 
        THEN (
          SELECT bmfolderid FROM bookmarksfolders WHERE LEFT(bmfolderid,8) = '00000000' AND uid = @uid
        ) 
        ELSE bmfolderid 
    END AS bmfolderid
    
  FROM 
      CTE
  WHERE bookmark = 1 ${whereClause} 
`

  logger.verbose(strQuery);

  dbRequest.query(strQuery)
  .then(dbRequest => {
    let rows = dbRequest.recordset;
    if (rows.length > 0){
        next(null, rows);
    }else{
      next(null,null);
    }
  })
  .catch(err => {
    next(err,null);
  })
}


// This function will get a JSON string containing all cache entries
// This function will update the cache on the MSSQL database
module.exports._updateTranslatorCache = async function(jsonString, next) {
  const dbRequest = await this.poolrequest();
  const strQuery = `
  MERGE INTO translator_cache AS target
  USING (SELECT 'translator_cache' AS cache_key, @jsonString AS cache_value, GETDATE() as updated) AS source
  ON target.cache_key = source.cache_key
  WHEN MATCHED THEN
      UPDATE SET cache_value = source.cache_value, updated = source.updated
  WHEN NOT MATCHED THEN
      INSERT (cache_key, cache_value, updated)
      VALUES (source.cache_key, source.cache_value, source.updated);
  `;

  dbRequest.input('jsonString', sql.NVarChar, jsonString);

  dbRequest.query(strQuery)
  .then(() => {
    next(null);
  })
  .catch(err => {
    next(err);
  })
}

module.exports._getTranslatorCache = async function(next) {
  const dbRequest = await this.poolrequest();
  const strQuery = `
  SELECT cache_value
  FROM translator_cache
  WHERE cache_key = 'translator_cache';
  `;

  dbRequest.query(strQuery)
  .then(qResult => {
      if (qResult.recordset.length > 0){
        next (null, qResult.recordset[0].cache_value);
      } else {
        next (null, null);
      }
  })
  .catch(err => {
      next (err, null);
  })
}

function validateDateBookmark(fromField, toField){
	var date_regex = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|1\d|2\d|3[01])$/;
	fromFieldValid = date_regex.test(fromField);
	toFieldValid = date_regex.test(toField);
	if (fromFieldValid && !toFieldValid){toField = fromField}
	else if (!fromFieldValid && toFieldValid){fromField = toField};
	if (fromFieldValid || toFieldValid){
		return ` BETWEEN CONVERT(DATE, CONVERT(VARCHAR(8), ${fromField}), 112) AND CONVERT(DATE, CONVERT(VARCHAR(8), ${toField}), 112);`
	}
	return null
}