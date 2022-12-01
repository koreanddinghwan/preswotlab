import dbConnectQuery from "../../../Common/tools/user/dBConnectQuery";
import getServerLoginInfo from "../../../Common/tools/user/getServerLoginInfo";
import {getRepAttrs} from "../editTable/getRepAttrs";
import {getRepKeys} from "../editTable/getRepKeys";
import {extractObjects} from "./extractObjects";

export class ScanResult
{
	#tableName;
	#loginInfo;
	#numOfRecords;
	#serverLoginInfo;
	#tableSeq;

	#repAttrJoinKey;
	#numericResult;
	#categoryResult;

	constructor (tableName, loginInfo) {
		this.#tableName = tableName;
		this.#loginInfo = loginInfo;
		this.#serverLoginInfo = getServerLoginInfo();
		this.#numOfRecords = null;
		this.#numericResult = null;
		this.#categoryResult = null;
	}

	/*
	 * repAttrJoinKey : API 요청당 1번만
	 * numericResult : API 요청 1번 -> 테이블 내의 모든 속성에 대해 요청
	 * categoryResult : API 요청 1번 -> 테이블 내의 모든 속성에 대해 요청
	 *
	 * */
	async getResult ()
	{
		//사용자 DB로부터 서버DB에 저장할 데이터를 객체 내부에 저장한다.
		await this.#setTableSeq();//tableSeq 세팅
		await this.#setNumOfRecords(); //현재 테이블의 전체 행 개수 세팅
		await this.#setRepAttrJoinKey();
		await this.#setNumeric(); //테이블 각 수치속성 scan
		await this.#setCategory();//테이블 각 범주속성 scan
		return ({
			repAttrJoinKey : this.#repAttrJoinKey,
			numericResult : this.#numericResult,
			categoryResult : this.#categoryResult
		});
	};

	async saveResult()
	{
		await this.#delExistMappingAndAttribute(); //이전에 스캔한 결과를 모두 삭제한다.
		await this.#saveNumericResult(); //객체에 저장된 수치속성 스캔결과를 서버에 저장한다.
		await this.#saveCategoryResult(); //객체의 범주속성 스캔결과를 서버에 서장.
		await this.#update_tb_scan_yn(); //테이블의 스캔 여부를 업데이트한다.
	};

	//이전에 스캔했던 결과를 모두 삭제.
	async #delExistMappingAndAttribute()
	{
		await dbConnectQuery(this.#serverLoginInfo,
		`
			DELETE
			FROM tb_mapping
			WHERE table_seq = ${this.#tableSeq};
		`);

		await dbConnectQuery(this.#serverLoginInfo,
		`
			DELETE 
			FROM tb_attribute
			WHERE table_seq = ${this.#tableSeq};
		`);
	}

	async #saveNumericResult()
	{
		for (let i = 0; i < this.#numericResult.length; i++)
		{
			await dbConnectQuery(this.#serverLoginInfo,
			`
				INSERT INTO tb_attribute (
				table_seq,
				attr_name,
				attr_type,
				d_type,
				null_num,
				diff_num,
				max_value,
				min_value,
				zero_num,
				key_candidate,
				rattr_seq
				) VALUES (
				${this.#tableSeq},
				'${this.#numericResult[i]['attrName']}',
				'N',
				'${this.#numericResult[i]['attrType']}',
				${this.#numericResult[i]['numOfNullRecords']},
				${this.#numericResult[i]['numOfDistinct']},
				${this.#numericResult[i]['max']},
				${this.#numericResult[i]['min']},
				${this.#numericResult[i]['numOfZero']},
				'${this.#numericResult[i]['recommended']}',
				NULL
				);
			`);
		}
	}

	async #saveCategoryResult()
	{
		for (let i = 0; i < this.#categoryResult.length; i++)
		{
			await dbConnectQuery(this.#serverLoginInfo,
			`
				INSERT INTO tb_attribute (
				table_seq,
				attr_name,
				attr_type,
				d_type,
				null_num,
				diff_num,
				special_num,
				key_candidate,
				rattr_seq
				) VALUES (
				${this.#tableSeq},
				'${this.#categoryResult[i]['attrName']}',
				'C',
				"${this.#categoryResult[i]['attrType']}",
				${this.#categoryResult[i]['numOfNullRecords']},
				${this.#categoryResult[i]['numOfDistinct']},
				${this.#categoryResult[i]['numOfSpcRecords']},
				'${this.#categoryResult[i]['recommended']}',
				NULL
				);
			`);

		}
	}

	async #update_tb_scan_yn()
	{
		await dbConnectQuery(this.#serverLoginInfo, 
			`
				UPDATE tb_scan
				SET scan_yn = 'Y'
				WHERE user_seq = ${this.#loginInfo.user_seq}
				AND table_name = '${this.#tableName}';
			`);
	}


	async #setNumeric () 
	{
		const result = await dbConnectQuery(this.#loginInfo, 
			`
			SHOW COLUMNS from ${this.#tableName} 
			WHERE TYPE LIKE '%int%' 
			OR TYPE LIKE 'double%' 
			OR TYPE LIKE 'float%'
			OR TYPE LIKE 'boolean'
			OR TYPE LIKE 'bit'
			OR TYPE LIKE 'decimal';
		`);
		const rtn = [];
		for (let i = 0; i < result.length; i++)
		{
			rtn.push(await this.#makeNumericScanObject(result[i]));
		}
		this.#numericResult = rtn;
	}

	async #setCategory () 
	{
		const result = await dbConnectQuery(this.#loginInfo, 
		`
		SHOW COLUMNS from ${this.#tableName} 
		WHERE TYPE LIKE '%char%' 
		OR TYPE LIKE '%text%' 
		OR TYPE LIKE '%date%'
		OR TYPE LIKE '%set%'
		OR TYPE LIKE '%time%'
		OR TYPE LIKE 'binary'
		OR TYPE LIKE 'enum';
		`);
		const rtn = [];
		for (let i = 0; i < result.length; i++)
		{
			rtn.push(await this.#makeCategoryScanObject(result[i]));
		}
		this.#categoryResult = rtn;
	};

	async #setTableSeq ()
	{
		const result_1 = await dbConnectQuery(this.#serverLoginInfo,
		`
			SELECT table_seq
			FROM tb_scan
			WHERE user_seq = '${this.#loginInfo.user_seq}'
			AND table_name = '${this.#tableName}'; 
		`);

		this.#tableSeq = result_1[0]['table_seq'];
	}

	async #setNumOfRecords () 
	{
		const result_2 = await dbConnectQuery(this.#loginInfo, 
		`
		SELECT *
		FROM ${this.#tableName};
		`);
		this.#numOfRecords = parseInt(result_2.length);

		await dbConnectQuery(this.#serverLoginInfo, 
		`
		UPDATE tb_scan
		SET row_num = ${this.#numOfRecords}
		WHERE table_seq = ${this.#tableSeq};
		`)
	}

	async #setRepAttrJoinKey ()
	{
		const repAttrResult =  await getRepAttrs();
		const repKeyResult = await getRepKeys();

		this.#repAttrJoinKey = {
			repAttrArray : extractObjects(repAttrResult, 'rattr_name'),
			repKeyArray : extractObjects(repKeyResult, 'rkey_name')

		};
	};

	async #makeCommonScanData (fieldInfo)
	{
		const attrName = fieldInfo.Field;
		const attrType = fieldInfo.Type;
		const numOfNullRecords = parseInt(await this.#getNumOfNullRecords(attrName));
		const portionOfNullRecords = parseInt(numOfNullRecords) / this.#numOfRecords;
		const numOfDistinct = await this.#getNumOfDistinct(attrName);
		return ({
			attrName,
			attrType,
			numOfNullRecords,
			portionOfNullRecords,
			numOfDistinct,
			recommended : (numOfDistinct / this.#numOfRecords > 0.9) ? 'y' : 'n'
		});
	};

	async #getNumOfNullRecords (attrName)
	{
		const result = await dbConnectQuery(this.#loginInfo, 
		`
		SELECT COUNT(*) 
		FROM ${this.#tableName}
		WHERE ${attrName} IS NULL;
		`);
		return (extractObjects(result, 'COUNT(*)')[0]);
	};

	async #getNumOfDistinct (attrName)
	{
		const result = await dbConnectQuery(this.#loginInfo,
		`
		SELECT DISTINCT ${attrName}
		FROM ${this.#tableName};
		;
		`);
		return (result.length);
	};

	async #makeMinMax (fieldInfo)
	{
		const result = await dbConnectQuery(this.#loginInfo,
		`
		SELECT MAX(${fieldInfo.Field}), MIN(${fieldInfo.Field})
		FROM ${this.#tableName};
		`);
		return ({
			max : extractObjects(result, `MAX(${fieldInfo.Field})`)[0],
			min : extractObjects(result, `MIN(${fieldInfo.Field})`)[0]
		});
	};

	async #getNumOfZero (fieldInfo)
	{
		const result = await dbConnectQuery(this.#loginInfo,
		`SELECT * 
		FROM ${this.#tableName} 
		WHERE ${fieldInfo.Field} = 0;
		`);
		const numOfZero = result.length;
		return ({
			numOfZero,
			portionOfZero : numOfZero / this.#numOfRecords
		});
	}

	async #makeNumericScanObject (fieldInfo)
	{
		return ({
			... await this.#makeCommonScanData(fieldInfo),
			... await this.#makeMinMax(fieldInfo),
			... await this.#getNumOfZero(fieldInfo)
		});
	};

	async #makeSpcRecordsData(fieldInfo)
	{
		const result = await dbConnectQuery(this.#loginInfo,
		`
			SELECT *
			FROM ${this.#tableName}
			WHERE ${fieldInfo.Field} LIKE '%[^0-9a-zA-Z ]%';
		`);

		const numOfSpcRecords = result.length;
		return ({
			numOfSpcRecords,
			portionOfSpcRecords : numOfSpcRecords / this.#numOfRecords
		})
	}

	async #makeCategoryScanObject (fieldInfo)
	{
		return ({
			... await this.#makeCommonScanData(fieldInfo),
			... await this.#makeSpcRecordsData(fieldInfo)
		});
	};
};
