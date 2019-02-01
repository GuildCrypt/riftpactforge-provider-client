const Web3HttpProvider = require('web3-providers-http')
const OathForgeProviderClient = require('../')
const Amorph = require('amorph')
const amorphHex = require('amorph-hex')

const mainnetProvider = new Web3HttpProvider(`https://mainnet.infura.io/v3/ddf5fd9bc2314199814e9398df57f486`)
mainnetProvider.sendAsync = mainnetProvider.send

describe('oathforge-provider-client', () => {
  let oathForgeProviderClient
  it('should instatitate', () => {
    const oathForgeAddress = Amorph.from(amorphHex.prefixed, '0xa307b905140c82b37f2d7d806ef9d8858d30ac87')
    oathForgeProviderClient = new OathForgeProviderClient(mainnetProvider, oathForgeAddress)
  })
  it('should get state', () => {
    return oathForgeProviderClient.fetchOathForgeState().then((oathForgeState) => {
      console.log(
        JSON.stringify(
          oathForgeState.toSimplePojo(), null, 4
        )
      )
    })
  })
})
