import repSelectListener from "./modules/repSelectListner.js";

const selectTags = document.getElementsByClassName("repSelect");
const delBtns = document.getElementsByClassName("delBtn");
const modBtns = document.getElementsByClassName("modBtn");

for (let i = 0; i < selectTags.length; i++)
{
	selectTags[i].addEventListener('change', repSelectListener);
};



