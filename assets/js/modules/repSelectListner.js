import addRepJoinKey from "./addRepJoinKey.js";
import addRepAttr from "./addRepAttr.js";

const repSelectListener = async (e) => {
	try {
		if (e.target.value == "addRepAttr")
			await addRepAttr(e);
		else if (e.target.value == "addRepJoinKey")
			await addRepJoinKey(e);
	} catch (e) {
		console.log(e);
	}
}

export default repSelectListener;
