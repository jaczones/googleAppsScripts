function getDevices() {
  const output = []
  let page
  let pageToken
  do {
    page = AdminDirectory.Chromeosdevices.list("my_customer",{
      maxResults: 1000,
      pageToken : pageToken
    })
    let devices = page.chromeosdevices
    devices.forEach(function(device) {
      if (device.status == 'ACTIVE'){
        output.push([device.serialNumber, device.orgUnitPath, device.lastSync])
        console.log(output)
      }
    })
  }
  while(pageToken)
}
