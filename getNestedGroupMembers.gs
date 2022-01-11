 ss = SpreadsheetApp.openById('<sheetId>').getSheetByName('Sheet1')
 
 function listGroupMembers(group) {
     const output = []
     if (!group){
     group = '<parent level group email>';  //Top level group to list down from (replace with yours)
     }
     let membersPage = AdminDirectory.Members.list(group, {
             maxResults: 1000
          });
     let members = membersPage.members;
     for (var i in members){
       let member = members[i];
       if (member.type == "USER"){
         if(!AdminDirectory.Users.get(member.email).suspended){ //Pull only non-suspended users
         output.push([member.email, group, AdminDirectory.Users.get(member.email).orgUnitPath]);  //Log Username, direct group membership, and OU path in separate columns
         }
       }else{
         listGroupMembers(member.email); // If the email is not a type #USER, run this same function on this email to grab nested members
       }
     }
     ss.getRange(1,1,output.length, output[0].length).setValues(output)
   }
