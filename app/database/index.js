const logger=require('../logger'); 
const sqlConfigPool = global.config_data.sqlConfigPool;
const sql = require('mssql');


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

module.exports._login = async function(username, password, next){
  var dbRequest = await this.poolrequest();
	dbRequest.input('username',sql.VarChar(255),username);
	dbRequest.input('password',sql.VarChar(255),password);
  let strQuery = `SELECT uid, disabled FROM users WHERE username = @username AND password = CONVERT(NVARCHAR(256),HASHBYTES('MD5', @password),2);`
  logger.verbose({SQLQuery: strQuery}); 
  dbRequest.query(strQuery)
    .then(dbRequest => {
      let rows = dbRequest.recordset;
      if (rows.length > 0){
        if (!rows[0].disabled){
          next(null,{success: true, uid: rows[0].uid});
        }
        else{
          next(null,{success: false, uid: rows[0].uid, message: "disabled"});
        }
      }
      else{
        next(null,{success: false, uid: null, message: "not found or wrong password"});
      }
    })
    .catch(err => {
      next(err,{success: false, uid: null, message: "not found or wrong password"});
    })
}

module.exports._userprofile = async function(uid, next){
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.Int, uid);
  var strQuery = `
  SELECT 
  displayname AS "userinfo.displayname", 
  logopath AS "userinfo.logopath",
  JSON_QUERY(searchvalues,'$') AS searchvalues 
  FROM [view.usersprofile] 
  WHERE uid = @uid FOR JSON PATH
  `;
  dbRequest.query(strQuery)
    .then(dbRequest => {
      let rows = dbRequest.recordset;
      if (rows.length > 0){
          next(null,{success: true, userprofile: rows[0]});
      }else{
        next(null,{success: false, message: "Userprofile not found"});
      }
    })
    .catch(err => {
      next(err,{success: false, message: "DB error"});
    })
}

module.exports._userprofile_v2 = async function(uid, next){
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.Int, uid);
  var strQuery = `
  SELECT
  displayname AS "userinfo.displayname",
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
  FROM [view.usersprofile]
  WHERE uid = @uid
  FOR JSON PATH;

  `;

  dbRequest.query(strQuery)
    .then(dbRequest => {
      let rows = dbRequest.recordset;
      if (rows.length > 0){
          next(null,{success: true, userprofile: rows[0]});
      }else{
        next(null,{success: false, message: "Userprofile not found"});
      }
    })
    .catch(err => {
      next(err,{success: false, message: "DB error"});
    })
}

module.exports._updatehistory = async function(uid, docid, status, next){
  var dbRequest = await this.poolrequest();
  dbRequest.input('uid', sql.Int, uid);
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
	  INSERT INTO dochistory (uid, docid, status) VALUES (@uid, @docid, @status)
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
  dbRequest.input('uid', sql.Int, uid);
  var strQuery = `SELECT docid, status FROM dochistory WHERE uid = @uid`
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

module.exports._getQuery = async function(field, id, uid){
  var dbRequest = await this.poolrequest();
  dbRequest.input('id', sql.Int, id);
  dbRequest.input('uid', sql.Int, uid);
  var strQuery = `
  SELECT JSON_VALUE(applicant.value, '$.query') AS query 
  FROM (SELECT searchvalues FROM usersprofile WHERE uid = @uid) as applicants
  CROSS APPLY OPENJSON(searchvalues, '$.${field}') AS applicant
  WHERE JSON_VALUE(applicant.value, '$.id') = @id;
`
  const qResult = await dbRequest.query(strQuery);
  if (qResult.recordset.length > 0){
    return (null, qResult.recordset[0].query); 
  }
  throw Error(`The query ${strQuery} returned no results.`);
}