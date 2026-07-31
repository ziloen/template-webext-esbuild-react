function removePopup() {
  return browser.action.setPopup({ popup: '' })
}

function setPopup() {
  return browser.action.setPopup({ popup: './pages/popup/index.html' })
}

export function grantAllUrlPermission() {
  browser.runtime.onInstalled.addListener(() => {
    browser.permissions.contains({ origins: ['<all_urls>'] }).then((val) => {
      if (!val) {
        removePopup()
      }
    })
  })

  let permissionRequesting: Promise<any> | null = null
  browser.action.onClicked.addListener((tab) => {
    if (permissionRequesting) return
    permissionRequesting = browser.permissions
      .request({ origins: ['<all_urls>'] })
      .then((result) => {
        if (result) {
          browser.action.getPopup({}).then((url) => {
            if (url) return
            setPopup()
          })
        } else {
          removePopup()
        }
      })
      .catch(removePopup)
      .finally(() => {
        permissionRequesting = null
      })

    browser.action.openPopup()
  })

  browser.permissions.onRemoved.addListener((permissions) => {
    if (permissions.origins?.includes('<all_urls>')) {
      removePopup()
    }
  })
}
