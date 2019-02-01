const waterfall = require('promise-waterfall')
const _ = require('lodash')
const Ultralightbeam = require('ultralightbeam')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const oathForgeInfo = require('oathforge')
const Amorph = require('amorph')
const amorphNumber = require('amorph-number')
const amorphHex = require('amorph-hex')
const amorphAscii = require('amorph-ascii')
const axios = require('axios')

function getSimplePojoKey(key, converter) {
  switch(converter) {
    case amorphNumber.unsigned:
      return `${key}Number`
    case amorphHex.unprefixed:
      return `${key}HexUnprefixed`
    case amorphAscii:
      return `${key}Ascii`
    default:
      throw new Error('Unkown Converter')
  }
}

class OathForgeState {

  constructor(pojo) {
    this.pojo = pojo
    this.converters = {
      address: amorphHex.unprefixed,
      totalSupply: amorphNumber.unsigned,
      nextTokenId: amorphNumber.unsigned
    }
    this.oathTokenConverters = {
      id: amorphNumber.unsigned,
      uri: amorphAscii,
      owner: amorphHex.unprefixed,
      sunsetInitiatedAt: amorphNumber.unsigned,
      sunsetLength: amorphNumber.unsigned,
      redemptionCodeHash: amorphHex.unprefixed,
      redemptionCodeHashSubmittedAt: amorphNumber.unsigned
    }
  }

  toSimplePojo() {
    const simplePojo = {}
    _.map(this.converters, (converter, key) => {
      simplePojo[getSimplePojoKey(key, converter)] = this.pojo[key].to(converter)
    })
    simplePojo.oathTokens = this.pojo.oathTokens.map((oathTokenPojo) => {
      const oathTokenSimplePojo = {}
      _.map(this.oathTokenConverters, (converter, key) => {
        oathTokenSimplePojo[getSimplePojoKey(key, converter)] = oathTokenPojo[key].to(converter)
        oathTokenSimplePojo.uriData = oathTokenPojo.uriData
      })
      return oathTokenSimplePojo
    })
    return simplePojo
  }
}

class OathForgeProviderClient {

  constructor(provider, oathForgeAddress) {
    this.provider = provider
    this.oathForgeAddress = oathForgeAddress
    this.ultralightbeam = new Ultralightbeam(provider)
    this.oathForge = new SolWrapper(this.ultralightbeam, oathForgeInfo.abi, oathForgeAddress)
  }

  fetchOathForgeState() {
    return this.fetchOathForgePojo().then((pojo) => {
      return new OathForgeState(pojo)
    })
  }

  fetchOathForgePojo() {
    const pojo = {
      address: this.oathForgeAddress,
      oathTokens: []
    }

    return this.oathForge.fetch('totalSupply()', []).then((totalSupply) => {
      pojo.totalSupply = totalSupply
    }).then(() => {
      return this.oathForge.fetch('nextTokenId()', [])
    }).then((nextTokenId) => {
      pojo.nextTokenId = nextTokenId
    }).then(() => {
      const nextTokenIdNumber = pojo.nextTokenId.to(amorphNumber.unsigned)
      return waterfall(_.range(nextTokenIdNumber).map((tokenIdNumber) => {
        return () => {
          const tokenId = Amorph.from(amorphNumber.unsigned, tokenIdNumber)
          return this.fetchOathTokenPojo(tokenId).then((oathTokenPojo) => {
            pojo.oathTokens.push(oathTokenPojo)
          })
        }
      })).then(() => {
        return pojo
      })
    })
  }

  fetchOathTokenPojo(tokenId) {
    const pojo = {
      id: tokenId
    }
    return this.oathForge.fetch('ownerOf(uint256)', [tokenId]).then((owner) => {
      pojo.owner = owner
    }).then(() => {
      return this.oathForge.fetch('tokenURI(uint256)', [tokenId])
    }).then((uri) => {
      pojo.uri = uri
    }).then(() => {
      return this.oathForge.fetch('sunsetInitiatedAt(uint256)', [tokenId])
    }).then((sunsetInitiatedAt) => {
      pojo.sunsetInitiatedAt = sunsetInitiatedAt
    }).then(() => {
      return this.oathForge.fetch('sunsetLength(uint256)', [tokenId])
    }).then((sunsetLength) => {
      pojo.sunsetLength = sunsetLength
    }).then(() => {
      return this.oathForge.fetch('redemptionCodeHash(uint256)', [tokenId])
    }).then((redemptionCodeHash) => {
      pojo.redemptionCodeHash = redemptionCodeHash
    }).then(() => {
      return this.oathForge.fetch('redemptionCodeHashSubmittedAt(uint256)', [tokenId])
    }).then((redemptionCodeHashSubmittedAt) => {
      pojo.redemptionCodeHashSubmittedAt = redemptionCodeHashSubmittedAt
    }).then(() => {
      return axios.get(pojo.uri.to(amorphAscii), {
        timeout: 2000
      }).then((response) => {
        pojo.uriData = response.data
      }, (err) => {
        pojo.uriData = null
      })
    }).then(() => {
      return pojo
    })
  }
}

module.exports = OathForgeProviderClient
