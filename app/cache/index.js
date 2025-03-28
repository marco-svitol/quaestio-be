const NodeCache = require("node-cache");
const db=require('../database');
const logger=require('../logger'); 
const nodeSchedule = require('node-schedule');

module.exports = class nodeCache{
	constructor(){
		this.nodeCache = new NodeCache( { checkperiod: 120 } );
		this.cacheExpireTime = global.config_data.cache.cacheExpireTime //OPS expire time
		this.cacheEnabled = global.config_data.cache.cacheEnabled  //en/dis global caching
		this.units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		this.cacheKeyPrefixes = {
			userAuth0Info: 'userAuth0Info',
			docSearch: 'docSearchResultsOPS',
			imageLink: 'imageLinkOPS',
			query: 'queryOPS',
			userProfile: 'userQProfile',
			familyId: 'familyIdOPS',
			translator: 'translatorAzure'
		};
		this.restoreTranslatorCache();
		this.translatorCacheNeedsDump = false;

		const minutes = global.config_data.cache.translatorCacheDumpIntervalMinutes;
		const schedule = `*/${minutes} * * * *`; // Run every 'minutes' minutes
		this.translatorCacheDumpSchedule = nodeSchedule.scheduleJob(schedule, () => {
			if (this.translatorCacheNeedsDump) {
				this.dumpTranslatorCache();
			}
			logger.debug(`translatorCacheDumpSchedule: next scheduled dump check at ${this.translatorCacheDumpSchedule.nextInvocation()}`);
		});
	}

	//Identity info cache
	getCacheKeyIdentityInfo(seed){
		return `${this.cacheKeyPrefixes.userAuth0Info}_${seed}`;
	}

	getCacheIdentityInfo(seed){
		const key = this.getCacheKeyIdentityInfo(seed);
		return this.nodeCache.get(key);
	}

	setCacheIdentityInfo(seed, value){
		const key = this.getCacheKeyIdentityInfo(seed);
		this.nodeCache.set(key, value, global.config_data.cache.auth0UserInfoCacheTTLSeconds);
	}

	//Doc search cache
	getCacheKeyDocSearch(seed){
		return `${this.cacheKeyPrefixes.docSearch}_${seed}`;
	}

	getCacheDocSearch(seed){
		const key = this.getCacheKeyDocSearch(seed);
		return this.nodeCache.get(key);
	}

	setCacheDocSearch(seed, value){
		const key = this.getCacheKeyDocSearch(seed);
		this.nodeCache.set(key, value, this.calculateTTL());
	}

	//Image link cache
	getCacheKeyImageLink(seed){
		return `${this.cacheKeyPrefixes.imageLink}_${seed}`;
	}

	getCacheImageLink(seed){
		const key = this.getCacheKeyImageLink(seed);
		return this.nodeCache.get(key);
	}

	setCacheImageLink(seed, value){
		const key = this.getCacheKeyImageLink(seed);
		this.nodeCache.set(key, value, this.calculateTTL());
	}

	//Query cache
	getCacheKeyQuery(seed){
		return `${this.cacheKeyPrefixes.query}_${seed}`;
	}

	getCacheQuery(seed){
		const key = this.getCacheKeyQuery(seed);
		return this.nodeCache.get(key);
	}

	setCacheQuery(seed, value){
		const key = this.getCacheKeyQuery(seed);
		this.nodeCache.set(key, value, this.calculateTTL());
	}

	//User profile cache
	getCacheKeyUserProfile(seed){
		return `${this.cacheKeyPrefixes.userProfile}_${seed}`;
	}

	getCacheUserProfile(seed){
		const key = this.getCacheKeyUserProfile(seed);
		return this.nodeCache.get(key);
	}

	setCacheUserProfile(seed, value){
		const key = this.getCacheKeyUserProfile(seed);
		this.nodeCache.set(key, value, this.calculateTTL());
	}

	delCacheUserProfile(seed){
		const key = this.getCacheKeyUserProfile(seed);
		return this.nodeCache.del(key);
	}
	
	//FamilyId cache
	getCacheKeyFamilyId(seed){
		return `${this.cacheKeyPrefixes.familyId}_${seed}`;
	}

	getCacheFamilyId(seed){
		const key = this.getCacheKeyFamilyId(seed);
		return this.nodeCache.get(key);
	}

	setCacheFamilyId(seed, value){
		const key = this.getCacheKeyFamilyId(seed);
		this.nodeCache.set(key, value, 0);
	}

	// Translator cache
	getCacheKeyTranslator(seed){
		return `${this.cacheKeyPrefixes.translator}_${seed}`;
	}

	getCacheTranslator(seed){
		const key = this.getCacheKeyTranslator(seed);
		return this.nodeCache.get(key);
	}

	setCacheTranslator(seed, value){
		const key = this.getCacheKeyTranslator(seed);
		this.nodeCache.set(key, value, 0);
		this.translatorCacheNeedsDump = true;
	}

	cacheReset() {
		this.nodeCache.flushAll();
		return true;
	}

	cacheStats() {
		return this.cacheStatsHumanReadable();
	}
	
	cacheStatsHumanReadable() {
		const stats = this.nodeCache.getStats();
		const humanReadableStats = {
			keys: stats.keys,
			hits: stats.hits,
			misses: stats.misses,
			keys: stats.keys,
			ksize: this.niceBytes(stats.ksize),
			vsize: this.niceBytes(stats.vsize),
			ctime: stats.ctime
		};
		return humanReadableStats;
	}

	cacheKeys() {
		const keys = this.nodeCache.keys();
		const keysWithTTL = keys.map(key => {
			const timeStampInMilliseconds = this.nodeCache.getTtl(key);
			const ttlTimestamp = new Date(timeStampInMilliseconds).toISOString();
			return { key, ttl: ttlTimestamp };
		});
		return keysWithTTL;
	}

	dumpTranslatorCache() {
		const keys = this.nodeCache.keys();
    const translatorKeys = keys.filter(key => key.includes(this.cacheKeyPrefixes.translator));

    const cacheEntries = translatorKeys.map(key => {
        const value = this.nodeCache.get(key);
        return { cachekey: key, cachevalue: value };
    });

    const jsonString = JSON.stringify(cacheEntries);

    db._updateTranslatorCache(jsonString, (err) => {
				if (err) {
						logger.error(`Error dumping translator cache: ${err}`);
				} else {
						logger.info(`Succesfully dumped ${cacheEntries.length} translator cache keys`);
						this.translatorCacheNeedsDump = false;
						return cacheEntries.length;
				}
		});
	}

	restoreTranslatorCache() {
		db._getTranslatorCache((err, body) => {
			if (err) {
				logger.error(`Error getting translator cache: ${err}`);
			} else {
				const cacheEntries = JSON.parse(body);
				cacheEntries.forEach(entry => {
					this.nodeCache.set(entry.cachekey, entry.cachevalue, 0);
				});
				logger.info(`Translator cache successfully restored ${cacheEntries.length} keys`);
			}
		});
	}

	// Function to calculate TTL based on expiration time
	calculateTTL() {
		// Parse expireTimeOPSCache value to obtain the hour and minute parts
		const expireTimeParts = this.cacheExpireTime.split(':');
		const expireTime = new Date();
		expireTime.setHours(parseInt(expireTimeParts[0]), parseInt(expireTimeParts[1]), 0);
	
		const now = new Date();
		let ttl = expireTime - now;
		if (ttl < 0) {
			// If it's already past the expiration time, calculate the remaining time until the next day's expiration time
			const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			const nextExpireTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), expireTime.getHours(), expireTime.getMinutes(), 0);
			ttl = nextExpireTime - now;
		}
		// Convert ttl from milliseconds to seconds and round to the nearest whole number
		return Math.round(ttl / 1000);
	}

	niceBytes(x){ //include a decimal point and a tenths-place digit if presenting less than ten of KB or greater units
		let l = 0, n = parseInt(x, 10) || 0;
		while(n >= 1024 && ++l)
			n = n/1024;
		return(`${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${this.units[l]}`);
	}
}


