//filename(htmlファイル)の内容を文字列で取得
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

//ユーザー情報を取得
function getUser_() {
    //ユーザーのGmailアドレスを取得
    const email = Session.getActiveUser().getEmail();
    //ユーザーの情報を取得
    //const {name, thumbnailPhotoUrl, organizations } = AdminDirectory.Users.get(email,{ viewType: 'domain_public'});
    //const organization = organizations.find(o => o.department);
    //const {department, description } = organization;

    //ユーザーが管理者かを判断する

    return {email};
    //return {email, name: name.fullName, type: description, organization: department, thumbnailUrl: thumbnailPhotoUrl};
}

//SHEET_NAMEのシートを取得
function getSheet_(SHEET_NAME) {
    return SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
}

const MAPDATA_SHEET_NAME = "登録データ";

//スプレッドシートからデータを取得する
function getDataSet() {
    const sheet = getSheet_(MAPDATA_SHEET_NAME);
    return sheet.getDataRange().getValues().slice(1).map(row => {
        const [name,link,latitude,longitude,comment,user,release] = row;
        return {name,link,latitude,longitude,comment,user,release}
    })
}

//配列のシャッフル
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

//リクルートAPIから店を探す
function getRandomSeartch(keyword) {
    let result = [];
    const URL = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/';
    const API_KEY = "APIキー";
    const URL_tmp = URL + '?key=' + API_KEY + '&keyword=' + keyword + "&format=json" + "&count=100";
    
    let response = UrlFetchApp.fetch(URL_tmp);
    var responseData = JSON.parse(response.getContentText());
    
    if(responseData["results"]["shop"].length === 0){
        return false;
    }
    
    let random = shuffle([...Array(responseData["results"]["shop"].length)].map((_, i) => i));
    console.log(responseData["results"]["shop"].length);
    for (let i = 0; i < Math.min(responseData["results"]["shop"].length,3); i++) {
    const shopData = responseData["results"]["shop"][random[i]];
    const resultObj = {
        "name": shopData["name"],
        "catch": shopData["catch"],
        "urls": shopData["urls"]["pc"]
    };
    result.push(resultObj);
    }

    console.log(result);
    return result;
}

function doGet() {
    const user = getUser_();
    const template = HtmlService.createTemplateFromFile("index");
    template.mail = user;
    template.dataSet = getDataSet();
    return template.evaluate();
}