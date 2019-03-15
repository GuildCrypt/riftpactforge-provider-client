const Web3HttpProvider = require('web3-providers-http')
const RiftpactforgeProviderClient = require('../')
const Amorph = require('amorph')
const amorphHex = require('amorph-hex')

const provider = new Web3HttpProvider(`https://rinkeby.infura.io/v3/ddf5fd9bc2314199814e9398df57f486`)
provider.sendAsync = provider.send

describe('riftpactforge-provider-client', () => {
  let riftpactforgeProviderClient
  it('should instatitate', () => {
    const riftpactforgeAddress = Amorph.from(amorphHex.unprefixed, '4b7fbe965081f1f5626e2662f2bbb352969ed14e')
    riftpactforgeProviderClient = new RiftpactforgeProviderClient(provider, riftpactforgeAddress)
  })
  it('should get state', () => {
    return riftpactforgeProviderClient.fetchRiftpactforgeState().then((riftpactforgeState) => {
      console.log(
        JSON.stringify(
          riftpactforgeState.toSimplePojo(), null, 4
        )
      )
    })
  })
})
