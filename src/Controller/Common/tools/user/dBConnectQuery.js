/*
 * DB종류에따라 연결을 수행
 * */

import MariaMyLogin from "./dblogin/MariaLogin";
import MssqlLogin from "./dblogin/MssqlLogin"
import getDbConfigByLoginInfo from "./getDbConfigByLoginInfo";

const dbConnectQuery = async(loginInfo, query) => {
	let result;

	const dbconfig = getDbConfigByLoginInfo(loginInfo);
	try {
		if (loginInfo.dbKind == 'MSSQL')
			result = await MssqlLogin(dbconfig, query);
		else if (loginInfo.dbKind == 'MARIADB' || loginInfo.dbKind == 'MYSQL')
			result = await MariaMyLogin(dbconfig, query);
		if (query)
			return (result);
	} catch (e) {
		console.log("dbConnectQuery error")
		throw(e)
	}
}

export default dbConnectQuery;
