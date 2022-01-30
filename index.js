import axios from 'axios'

class HTTPLockMechanism {
  constructor (log, config, api) {
    this.Service = api.hap.Service
    this.Characteristic = api.hap.Characteristic

    // config defaults
    const defaults = {
      method: 'GET',
      autoLockTimeout: 5 * 1000
    }

    this.log = log
    this.config = { ...defaults, ...config }

    // initialize lock mechanism
    this.lockMechanism = new this.Service.LockMechanism(this.config.name)
  }
  autoLock () {
    if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout)
    this.autoLockTimeout = setTimeout(() => {
      this.log.debug('Auto locking accessory')
      this.state(1)
    }, this.config.autoLockTimeout)
  }
  state (state) {
    this.lockMechanism.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(state)
    this.lockMechanism.getCharacteristic(this.Characteristic.LockTargetState).updateValue(state)
  }
  setLockState (value, callback) {
    return axios({
      method: this.config.method,
      url: this.config.url
    }).then(() => {
      this.log.debug('Unlocking accessory')
      this.state(0)
      this.autoLock()
      callback()
    }).catch(err => {
      this.log.warn('HTTP request failed', err.message)
      this.state(new Error('HTTP request failed'))
      callback(err)
    })
  }
  getServices () {
    // initialize information service
    this.informationService = new this.Service.AccessoryInformation()
    this.informationService.setCharacteristic(this.Characteristic.Manufacturer, 'eo')

    this.lockMechanism
      .getCharacteristic(this.Characteristic.LockTargetState)
      .on('set', this.setLockState.bind(this))

    // set initial state
    this.log.debug('Setting initial accessory state')
    this.state(1)

    return [this.informationService, this.lockMechanism]
  }
}

export default function (homebridge) {
  homebridge.registerAccessory('@eymengunay/homebridge-http-lock-mechanism', 'HTTPLockMechanism', HTTPLockMechanism)
}