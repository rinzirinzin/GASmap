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
  return email;
  //return {email, name: name.fullName, type: description, organization: department, thumbnailUrl: thumbnailPhotoUrl};
}

//外部からアクセスするときの踏み台
function includeUserInHTML() {
  const user = getUser_();
  return user;
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
    const [name,link,address,stationname,latitude,longitude,comment,user,release,id,date] = row;
    //日付を文字列に変換(こうしないとnullになっちまう)
    const formattedDate = date instanceof Date ? date.toLocaleString() : null;
    return {name,link,address,stationname,latitude,longitude,comment,user,release,id,formattedDate}
  })
}

//スプレッドシートからデータを削除する
function deleteSheetRows(id) {
  const sheet = getSheet_(MAPDATA_SHEET_NAME);
  //idが一致する行を探索
  const data = sheet.getDataRange().getValues();
  const columnIndex = data[0].indexOf("id");
  let deleteRow = -1;
  for(let i = 1; i < data.length; i++){
    if(data[i][columnIndex] === id) {
      deleteRow = i+1;
      break
    }
  }
  if(deleteRow < 0){
    return false;
  }
  sheet.deleteRow(deleteRow);
  return true;
}

//データをスプレッドシートに反映
function registReview(storename,link,address,stationname,latitude,longitude,comment,release) {
  const user = getUser_();
  const id = Utilities.getUuid();
  const ReserveData = [storename,link,address,stationname,latitude,longitude,comment,user,release,id,new Date()];
  getSheet_(MAPDATA_SHEET_NAME).appendRow(ReserveData);
  return 0;
}

//配列のシャッフル
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const URL = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/';
const API_KEY = "APIキー";

//データを登録する
function reflectionData(storename,comment,checkValue) {
  const URL_tmp = URL + '?key=' + API_KEY + '&name=' + storename + "&format=json" + "&count=1";
  let response = UrlFetchApp.fetch(URL_tmp);
  var responseData = JSON.parse(response.getContentText());
  const shopData = responseData["results"]["shop"][0];
  //登録失敗
  if(responseData["results"]["shop"].length === 0){
    return false;
  }
  let link = shopData["urls"]["pc"];
  let address = shopData["address"];
  let stationname = shopData["station_name"];
  let latitude = shopData["lat"];
  let longitude = shopData["lng"];
  let release;
  if (checkValue === "releaseok") {
    release = true;
  } else {
    release = false;
  }
  registReview(storename,link,address,stationname,latitude,longitude,comment,release);
  return true;
}

//リクルートAPIからランダムに店を探す
function getRandomSearch(keyword) {
  let result = [];
  const URL_tmp = URL + '?key=' + API_KEY + '&keyword=' + keyword + "&format=json" + "&count=100";

  if(keyword === ""){
    return false;
  }

  let response = UrlFetchApp.fetch(URL_tmp);
  var responseData = JSON.parse(response.getContentText());
    
  if(responseData["results"]["shop"].length === 0 || keyword === ""){
    return false;
  }
    
  let random = shuffle([...Array(responseData["results"]["shop"].length)].map((_, i) => i));

  for (let i = 0; i < Math.min(responseData["results"]["shop"].length,5); i++) {
    const shopData = responseData["results"]["shop"][random[i]];
    const resultObj = {
      "name": shopData["name"],
      "catch": shopData["catch"],
      "urls": shopData["urls"]["pc"]
    };
    result.push(resultObj);
  }

  return result;
}

//リクルートAPIから店を探す
async function getRegisterSearch(keyword,swkey){
  let result = [];
  let URL_tmp;
  if(keyword === ""){
    return false;
  }
  if(swkey === 'name'){
    URL_tmp = URL + '?key=' + API_KEY + '&keyword=' + keyword + "&format=json" + "&count=1";
  }
  else if(swkey === 'tel'){
    URL_tmp = URL + '?key=' + API_KEY + '&tel=' + keyword.replace(/-/g,"")+ "&format=json";
  }
  let response = UrlFetchApp.fetch(URL_tmp);
  var responseData = JSON.parse(response.getContentText());
    
  if(responseData["results"]["shop"].length === 0){
    return false;
  }
  const shopData = responseData["results"]["shop"][0];
  const resultObj = {
    "name": shopData["name"],
    "catch": shopData["catch"],
    "urls": shopData["urls"]["pc"],
    "tel" : shopData["tel"]
  };
  result.push(resultObj);
  return result;
}

function doGet() {
  const user = getUser_();
  const template = HtmlService.createTemplateFromFile("index");
  template.mail = user;
  template.dataSet = getDataSet();
  return template.evaluate().setTitle('お食事処 掲示板')
}