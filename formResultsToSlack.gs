// This is configured as a Google Apps Script linked to the Google Form
// Create an incoming webhook for the channel you want responses sent to here - https://api.slack.com/incoming-webhooks
var POST_URL = <Slack Webhook URL>;

function onSubmit(e) {
  var response = e.response.getItemResponses(); //get form responses on submit https://developers.google.com/apps-script/reference/forms/form-response
  
  var fields = [
    {"title": "From", "value": e.response.getRespondentEmail()},
    {"title": "When", "value": e.response.getTimestamp()}
  ];
  
  for (var i = 0; i < response.length; i++) {
    var question = response[i].getItem().getTitle();
    var answer = response[i].getResponse();
    
    fields.push({"title": question, "value": answer});
  }
    
  var summaryAttachment = {
    "fallback": FormApp.getActiveForm().getTitle(),
    "pretext": "New response submitted to: " + FormApp.getActiveForm().getTitle(),
    "title_link": "https://docs.google.com/spreadsheets/d/" + FormApp.getActiveForm().getDestinationId(),
    "fields": fields
  };
  
  var responseAttachment = {
    "fallback": FormApp.getActiveForm().getTitle(),
    "title": "View all responses",
    "title_link": <link to Google Sheet with all responses>
  };

  // For prettier message formatting in Slack you can also leverage Block Kit Builder https://app.slack.com/block-kit-builder
  var options = {
    "method" : "POST",
    "payload": JSON.stringify({
      "username": "Name that will appear as sender",
      "icon_emoji": ":awesome:", //replace with any emoji or remove
      "attachments": [summaryAttachment, responseAttachment]
    })
  };

   UrlFetchApp.fetch(POST_URL, options);
};
