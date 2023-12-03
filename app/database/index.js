const logger=require('../logger'); 
const sqlConfigPool = global.config_data.sqlConfigPool;
const sql = require('mssql');

const getuserProfile = `
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
FROM [usersprofile]
WHERE uid = @uid
FOR JSON PATH;
`

const guestLogo = 'https://quaestiosa.blob.core.windows.net/quaestio/logo_default.jpg'

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
  dbRequest.input('uid', sql.VarChar(50), uid);
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
    INSERT INTO usersprofile (uid, searchValues, logopath, displayname)
    SELECT @uid, searchvalues, ${guestLogo}, 'guest'
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

module.exports._getQuery = async function(field, id, uid){
  var dbRequest = await this.poolrequest();
  dbRequest.input('id', sql.Int, id);
  dbRequest.input('uid', sql.VarChar(50), uid);
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