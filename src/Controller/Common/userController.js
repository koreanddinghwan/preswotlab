import dbConnectQuery from "./tools/user/dBConnectQuery";
import getLoginInfoByForm from "./tools/user/getLoginInfoByForm";
import {syncUser} from "./tools/user/syncUser";
import fs from 'fs';

//GET /login
export const getLogin = (req, res) => {
	return res.render('login', { title : 'login'})
}

//POST /login
//db connection 필요하므로, async로 정의
export const postLogin = async (req, res) => {
	//config파일 만들어오기
	const loginInfo = getLoginInfoByForm(req.body);
	try {
		//db에 사용자 있는지 없는지 확인하고, 없으면 생성
		const syncUserObj = new syncUser(loginInfo);
		//첫 로그인 시 현재 사용자 DB기반으로 tb_scan 생성
		await syncUserObj.sync();
		req.session.user_seq = syncUserObj.getUserSeq();

		//브라우저측에 세션정보 저장하기
		req.session.loggedIn = true;
		req.session.loginInfo = {...loginInfo, user_seq : req.session.user_seq};
		res.redirect('/');
	} catch (e) {
		console.log(e.message);
		return (res.status(400).render('login', { 
			title : 'login'}))
	}
}

export const getLogout = (req, res) => {
	req.session.destroy();
	return res.redirect("/");
}
