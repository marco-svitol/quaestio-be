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
  logger.verbose(strQuery); 
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
  var strQuery = `SELECT displayname AS "userinfo.displayname", JSON_QUERY(searchvalues,'$') AS searchvalues FROM [view.usersprofile] WHERE uid = @uid FOR JSON PATH`;
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

// module.exports._mainview = function (next) {
//   let strQuery = `CALL pcpMainView();`
//   let i = 0
//   pool.query(strQuery, (err,res) => {
//     if (err) {
//       next (err, 0)
//     }else{
//       if (res.length > 0){
//         let main = [{}]
//         let maindata = main[0]
//         maindata["maincash"] = res[0]
//         maindata["pos"] = res[1]
//         let cleanactions = [{}]
//         for (let actionitem of res[3]){
//           actionitem = Object.assign({},actionitem, JSON.parse(actionitem.POSActionParams))
//           cleanactions.push(actionitem)
//         }
//         for (let pos of maindata["pos"]){ //iterate on POS
//           let poscash = res[2].filter(element => element.POSId == pos.POSId ) //filter for each POS
//           pos["received"] = [{}]
//           i = 0
//           for (poscashrow of poscash){ //feed currency amounts and received
//             pos[poscashrow.currency]      = poscashrow.totalamount
//             pos["received"][i] = {}
//             pos["received"][i]["currency"]   = poscashrow.currency
//             pos["received"][i]["amount"]     = poscashrow.lastreceivedamount
//             pos["received"][i]["timestamp"]  = poscashrow.lastreceivedtimestamp
//             i += 1
//           }
//           pos["sendtopos"]  = cleanactions
//                               .filter(element => element.POSId == pos.POSId && element.action == "sendtopos")
//                               .map(({ POSId,action,POSActionId,POSActionParams, ...item }) => item)
//           pos["CHFtransfer"] = cleanactions
//                               .filter(element => element.POSId == pos.POSId && element.action == "CHFtransfer")
//                               .map(({ POSId,action,POSActionId,POSActionParams, ...item }) => item)
//         }
//         //maindata["log"] = res[4]
//         next(null, main)
//       }else next(null,0);
//     }
//   })  
// }



// module.exports._APIKeyGen = function (username, password, next){
//   this._login(username, password, "addpos", function(err, res){
//     if (err){
//       return next(err)
//     }else{
//       if (res.success){
//         //Generate APIKey
//         let newAPIKey = randtoken.uid(50)
//         return next(null,{APIKey: newAPIKey})
//       }else{
//         return next(null, {err: res})
//       }
//     }
//   })
// }
