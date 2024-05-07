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
                FROM OPENJSON(searchvalues, '$.applicants')
                WITH (id VARCHAR(10) '$.id', name VARCHAR(100) '$.name')
                FOR JSON PATH
            ) AS applicants,
            (
                SELECT id, name
                FROM OPENJSON(searchvalues, '$.tecareas')
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

module.exports._userprofile = async function(uid, org_id, next){
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
  
  dbRequest.query(strQuery)
  .then(dbRequest => {
    let rows = dbRequest.recordset;
    if (rows.length > 0){
        if (rows[0] != null){
          return next(null,{success: true, userprofile: rows[0]});
        }
    } 
    next(null,{success: false, message: "Userprofile not found"});
  })
  .catch(err => {
    next(err,{success: false, message: "DB error"});
  })

}

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

module.exports._updatehistory = async function(uid, docid, status, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('docid', sql.NVarChar, docid);
  dbRequest.input('status', sql.Int, status);
  const strQuery = `
IF EXISTS (SELECT 1 FROM dochistory WHERE uid = @uid AND docid = @docid)  
BEGIN  
	UPDATE dochistory   
	SET status = 2  
	WHERE uid = @uid AND docid = @docid;  
END  
ELSE  
BEGIN  
	  INSERT INTO dochistory (uid, docid, status, bookmark, docmetadata, notes, bmfolderid) VALUES (@uid, @docid, @status, 0, '', '', null)
END`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._updatebookmark = async function(uid, docid, bookmark, bmfolderid, status, docmetadata = '', next){
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
  dbRequest.input('status', sql.Int, status);
  dbRequest.input('docmetadata', sql.NVarChar, docmetadata);
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
	  INSERT INTO dochistory (uid, docid, status, bookmark, docmetadata, notes, bmfolderid) VALUES (@uid, @docid, @status , 1, @docmetadata, '', @actual_bmfolderid)
END`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._updatenotes = async function(uid, docid, notes, status, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('docid', sql.NVarChar, docid);
  dbRequest.input('status', sql.Int, status);
  dbRequest.input('notes', sql.NVarChar, notes);
  const strQuery = `
IF EXISTS (SELECT 1 FROM dochistory WHERE uid = @uid AND docid = @docid)  
  BEGIN
    UPDATE dochistory   
    SET notes = @notes
    WHERE uid = @uid AND docid = @docid;  
  END  
  ELSE  
  BEGIN  
      INSERT INTO dochistory (uid, docid, status, bookmark, docmetadata, notes, bmfolderid) VALUES (@uid, @docid, @status , 1, '', @notes, null)
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

module.exports._updatebmfolder = async function(uid, bmfolderid, bmfoldername, next){
  if (bmfolderid.substring(0, 9) === '00000000-'){
    // Raise error with HTTP status 403 and message "can't modify default bookmark folder"
    const error = new Error(`can't modify or delete default bookmark folder ${bmfolderid}`);
    error.status = 403; // HTTP status 403 Forbidden
    return next(error);
  }
  
  try {
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
    next(null, result);
  } catch (err) {
    next(err);
  }
}


module.exports._gethistory = async function(uid, next){
  const dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  const strQuery = `
  SELECT
    docid,
    status,
    bookmark,
    notes,
    CASE WHEN bmfolderid IS NULL THEN (SELECT bmfolderid FROM bookmarksfolders WHERE LEFT(bmfolderid,8) = '00000000' AND uid = @uid) ELSE bmfolderid END AS bmfolderid
FROM
    dochistory 
WHERE
    uid = @uid;
  `
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

module.exports._getQuery = async function(field, id, org_id){
  const dbRequest = await this.poolrequest();
  dbRequest.input('id', sql.Int, id);
  dbRequest.input('org_id', sql.Int, org_id);
  const strQuery = `
  SELECT JSON_VALUE(applicant.value, '$.query') AS query 
  FROM (SELECT searchvalues FROM orgsprofile WHERE org_id = @org_id) as applicants
  CROSS APPLY OPENJSON(searchvalues, '$.${field}') AS applicant
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
    whereClause = ` AND JSON_VALUE(docmetadata, '$.doc_num') = @doc_num`;
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
    SELECT
    JSON_VALUE(docmetadata, '$.doc_num') AS doc_num,
    JSON_VALUE(docmetadata, '$.type') AS type,
    JSON_VALUE(docmetadata, '$.familyid') AS familyid,
    JSON_VALUE(docmetadata, '$.country') AS country,
    JSON_VALUE(docmetadata, '$.invention_title') AS invention_title,
    JSON_VALUE(docmetadata, '$.date') AS date,
    JSON_VALUE(docmetadata, '$.abstract') AS abstract,
    JSON_VALUE(docmetadata, '$.applicant') AS applicant,
    JSON_VALUE(docmetadata, '$.inventor_name') AS inventor_name,
    JSON_VALUE(docmetadata, '$.ops_link') AS ops_link,
    status as read_history,
    bookmark,
    notes,
    CASE WHEN bmfolderid IS NULL 
    THEN (
      SELECT bmfolderid FROM bookmarksfolders WHERE LEFT(bmfolderid,8) = '00000000' AND uid = @uid
      ) 
    ELSE bmfolderid END AS bmfolderid
    
    FROM dochistory 
    WHERE
    uid = @uid AND bookmark = 1 ${whereClause}
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