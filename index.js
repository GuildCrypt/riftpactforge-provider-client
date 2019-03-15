const waterfall = require('promise-waterfall')
const _ = require('lodash')
const Ultralightbeam = require('ultralightbeam')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')
const Amorph = require('amorph')
const amorphNumber = require('amorph-number')
const amorphHex = require('amorph-hex')
const amorphAscii = require('amorph-ascii')
const axios = require('axios')
const riftpactforgeInfo = require('riftpactforge')
const riftpactInfo = require('riftpact')

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

class RiftpactState {

  constructor(pojo) {
    this.pojo = pojo
    this.converters = {
      address: amorphHex.unprefixed,
      rftsCount: amorphNumber.unsigned,
    }
    this.riftpactConverters = {
      id: amorphNumber.unsigned,
      parentToken: amorphHex.unprefixed,
      parentTokenId: amorphNumber.unsigned,
      totalSupply: amorphNumber.unsigned,
      currencyAddress: amorphHex.unprefixed,
      auctionAllowedAt: amorphNumber.unsigned,
      minAuctionCompleteWait: amorphNumber.unsigned,
      minAuctionCompleteWait: amorphNumber.unsigned,
      minBidDeltaPermille: amorphNumber.unsigned
    }
  }

  toSimplePojo() {
    const simplePojo = {}
    _.map(this.converters, (converter, key) => {
      simplePojo[getSimplePojoKey(key, converter)] = this.pojo[key].to(converter)
    })
    simplePojo.riftpacts = this.pojo.riftpacts.map((riftpactPojo) => {
      const riftpactSimplePojo = {}
      _.map(this.riftpactConverters, (converter, key) => {
        riftpactSimplePojo[getSimplePojoKey(key, converter)] = riftpactPojo[key].to(converter)
        riftpactSimplePojo.uriData = riftpactPojo.uriData
      })
      return riftpactSimplePojo
    })
    return simplePojo
  }
}

class RiftpactforgeProviderClient {

  constructor(provider, riftpactforgeAddress) {
    this.provider = provider
    this.riftpactforgeAddress = riftpactforgeAddress
    this.ultralightbeam = new Ultralightbeam(provider)
    this.riftpactforge = new SolWrapper(this.ultralightbeam, riftpactforgeInfo.abi, riftpactforgeAddress)
  }

  async fetchRiftpactforgeState() {
    const pojo = await this.fetchRiftpactforgePojo()
    return new RiftpactState(pojo)
  }

  async fetchRiftpactforgePojo() {
    const pojo = {
      address: this.riftpactforgeAddress,
      riftpacts: []
    }

    pojo.rftsCount = await this.riftpactforge.fetch('rftsCount()', [])
    const rftsCountNumber = pojo.rftsCount.to(amorphNumber.unsigned)
    for (let idNumber = 0; idNumber < rftsCountNumber; idNumber++) {
      const id = Amorph.from(amorphNumber.unsigned, idNumber)
      const riftpactPojo = await this.fetchRiftpactPojo(id)
      pojo.riftpacts.push(riftpactPojo)
    }
    return pojo
  }

  async fetchRiftpactPojo(id) {
    const pojo = {
      id: id
    }
    pojo.address = await this.riftpactforge.fetch('rfts(uint256)', [id])

    const riftpact = new SolWrapper(this.ultralightbeam, riftpactInfo.abi, pojo.address)

    pojo.parentToken = await riftpact.fetch('parentToken()', [])
    pojo.parentTokenId = await riftpact.fetch('parentTokenId()', [])
    pojo.totalSupply = await riftpact.fetch('totalSupply()', [])
    pojo.currencyAddress = await riftpact.fetch('currencyAddress()', [])
    pojo.auctionAllowedAt = await riftpact.fetch('auctionAllowedAt()', [])
    pojo.minAuctionCompleteWait = await riftpact.fetch('minAuctionCompleteWait()', [])
    pojo.minBidDeltaPermille = await riftpact.fetch('minBidDeltaPermille()', [])

    return pojo
  }
}

module.exports = RiftpactforgeProviderClient
