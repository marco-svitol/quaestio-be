const logger=require('../logger'); 
const sqlConfigPool = global.config_data.sqlConfigPool;
const sql = require('mssql');
const utils=require('../utils');

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
) AS searchvalues
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
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('org_id', sql.Int, org_id);
  var strQuery = `
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
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  var strQuery = `
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
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('docid', sql.NVarChar, docid);
  dbRequest.input('status', sql.Int, status);
  var strQuery = `
IF EXISTS (SELECT 1 FROM dochistory WHERE uid = @uid AND docid = @docid)  
BEGIN  
	UPDATE dochistory   
	SET status = 2  
	WHERE uid = @uid AND docid = @docid;  
END  
ELSE  
BEGIN  
	  INSERT INTO dochistory (uid, docid, status, bookmark) VALUES (@uid, @docid, @status, 0)
END`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._updatebookmark = async function(uid, docid, bookmark, status, docmetadata = '', next){
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  dbRequest.input('docid', sql.NVarChar, docid);
  dbRequest.input('bookmark', sql.Bit, bookmark);
  dbRequest.input('status', sql.Int, status);
  dbRequest.input('docmetadata', sql.NVarChar, docmetadata);
  var strQuery = `
IF EXISTS (SELECT 1 FROM dochistory WHERE uid = @uid AND docid = @docid)  
BEGIN
	UPDATE dochistory   
	SET bookmark = @bookmark, docmetadata = @docmetadata
	WHERE uid = @uid AND docid = @docid;  
END  
ELSE  
BEGIN  
	  INSERT INTO dochistory (uid, docid, status, bookmark, docmetadata) VALUES (@uid, @docid, @status , 1, @docmetadata)
END`
  dbRequest.query(strQuery)
    .then(() => {
      next(null);
    })
    .catch(err => {
      next(err);
    })
}

module.exports._gethistory = async function(uid, next){
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.VarChar(50), uid);
  var strQuery = `SELECT docid, status, bookmark FROM dochistory WHERE uid = @uid`
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
  var dbRequest = await this.poolrequest();
  dbRequest.input('id', sql.Int, id);
  dbRequest.input('org_id', sql.Int, org_id);
  var strQuery = `
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
  var dbRequest = await this.poolrequest();
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
			const queryDate = utils.validateDateBookmark(queryParams.pdfrom, queryParams.pdto);
      if (queryDate){
        conditions.push( ` CONVERT(DATE, JSON_VALUE(docmetadata, '$.date'), 112) ${queryDate}`);
      }
		}

		if (conditions.length > 0) {
			whereClause = "AND " + conditions.join(" AND ");
		} 
  }

  var strQuery = `
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
    bookmark 
    
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