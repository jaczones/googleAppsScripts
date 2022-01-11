//Output Google Users to Sheets by OU

function getUsersByOu() {
  let ss = SpreadsheetApp.openById('<sheetID>')
  let sheet1 = ss.getSheetByName("Sheet1")
  let sheet2 = ss.getSheetByName("Sheet2")
  let sheet3 = ss.getSheetByName("Sheet3")
  let output = [], output2 = [], output3 = []
  let pageToken
  do {
    const page = AdminDirectory.Users.list({
      domain: '<domain name>', // can also user customer: myCustomer
      maxResults: 100,
      pageToken: pageToken
    })
    let users = page.users;
    if(users) {
      users.forEach(function(user) {
        if (user.orgUnitPath === '<org unit path name>'){ // ie '/Users' if all users are in an OU called Users nested within root
          output.push([user.primaryEmail])
        }
        else if(user.orgUnitPath === '<org unit path name 2>'){ // Users in a secondary OU
          output2.push([user.primaryEmail])
        }
        else {
          output3.push([user.primaryEmail]) // everyone else
        }
      })
      pageToken = page.nextPageToken;
    }
  } while (pageToken)
  sheet1.getRange(1,1,output.length, output[0].length).setValues(output)
  sheet2.getRange(1,1,output2.length, output2[0].length).setValues(output2)
  sheet3.getRange(1,1,output3.length, output3[0].length).setValues(output3)
}
