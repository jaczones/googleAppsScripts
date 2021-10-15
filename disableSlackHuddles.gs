//This is configured to run in Google Apps script with a time driven trigger that runs daily

function createTimeDrivenTriggers() {
  // Trigger every day at 3AM
  ScriptApp.newTrigger('checkChannelPrefs')
      .timeBased()
      .everyDays(1)
      .atHour(3)
      .create();

function getChannelList(){
  var output = [];
  var cursor
  var url = 'https://slack.com/api/conversations.list?team_id=<TEAM ID>&limit=999'
  var pagedUrl = 'https://slack.com/api/conversations.list?team_id=<TEAM ID>&limit=999&cursor='
    
  do {
  var response = UrlFetchApp.fetch(url, channelListOptions); //channelListOptions is a config.gs file with API creds
  var JSONresponse = JSON.parse(response); 
  for (i in JSONresponse['channels']){
    var members = JSONresponse['channels'][i]['num_members'] //returns number of members in channel
    var channelId = JSONresponse['channels'][i]['id'] //returns channel ID
    if (members > 150) {
      output.push(channelId)// creates array of channel IDs with a member count higher than 150
    }
  }
    var cursor = JSONresponse['response_metadata']['next_cursor'] //paging response data
    Utilities.sleep(500) // rate limit prevention
    url = pagedUrl + cursor
  } while (cursor);
    return output // returns array of channel IDs
}

function checkChannelPrefs() {
  var channels = getChannelList() //change to getChannelList() for production
  for (i in channels) {
    var targetChannel = channels[i]
    var prefsUrl = "https://slack.com/api/admin.conversations.getConversationPrefs?channel_id=" + targetChannel
    var response = UrlFetchApp.fetch(prefsUrl, channelGetOptions)  // channelGetOptions is API token object in config.gs
    var JSONresponse = JSON.parse(response)
    try {
      huddlesEnabled = JSONresponse["prefs"]["can_huddle"]["enabled"] // returns boolean value if Huddles is enabled/disabled
    } catch (error) {
      disableHuddles(targetChannel) //this is to catch the error of the can_huddle attribute not yet being visible 
    }
    if (huddlesEnabled) {
       disableHuddles(targetChannel) //only runs disable function if Huddles is enabled
     }
    else {
      Logger.log(`Huddles was not enabled for ${targetChannel}`)
    }
  }
}

function disableHuddles(targetChannel) {
  if (allowList[targetChannel]) {
      return
    }
  var params = "{'can_huddle':'false'}"
  var huddlesUrl = "https://slack.com/api/admin.conversations.setConversationPrefs?channel_id=" + targetChannel + "&prefs=" + encodeURIComponent(params)
  var response = UrlFetchApp.fetch(huddlesUrl, channelPostOptions)  // channelPostOptions is an API token object in config.gs script file
  Logger.log(`Huddles disabled for ${targetChannel}`)
  Utilities.sleep(3000)
}
