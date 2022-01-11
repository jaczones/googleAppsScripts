let ss = SpreadsheetApp.openByUrl('<spreadsheet url>').getSheetByName('<sheet name')

function getUsers() {
  let output = []
  let pageToken
  do {
    const response = AdminDirectory.Users.list('my_customer',{
      maxResults: 100,
      pageToken: pageToken
    })
    //const JSONresponse = JSON.parse(response)
    let users = response.users
    if(users){
      users.forEach(function(user) {
        if(user.isEnrolledIn2Sv == false && user.suspended == false) { // generate report of Active users who do not have 2FA enabled
          output.push([user.primaryEmail])
        }
      })
    }
    
    pageToken = response.nextPageToken
  } while (pageToken)
  ss.getRange(1,1, output.length, output[0].length).setValues(output)
}
