import dbConnectQuery from "./tools/user/dBConnectQuery";
import getLoginInfoByForm from "./tools/user/getLoginInfoByForm";
import getUserSeq from "./tools/user/getUserSeq";
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
		await dbConnectQuery(loginInfo, null);
		//db에 사용자 있는지 없는지 확인하고, 없으면 생성
		req.session.user_seq = await getUserSeq(loginInfo);
	} catch (e) {
		console.log(e.message);
		return (res.status(400).render('login', { 
			title : 'login'}))
	}
	console.log('로그인성공!');

	//브라우저측에 세션정보 저장하기
	req.session.loggedIn = true;
	req.session.loginInfo = {...loginInfo};
	req.session.filePaths = [];
	res.redirect('/');
}

export const getLogout = (req, res) => {
	const filePaths = req.session.filePaths;

	console.log(filePaths)
	filePaths.forEach
	(
		elem => {
			fs.unlinkSync(
					elem,
					function (e)
					{
						console.log(e);
						throw(e)
					}
				)
		}
	);
	req.session.destroy();
	return res.redirect("/");
}
