const NodeCache = require("node-cache");

module.exports = class nodeCache{
	constructor(){
    	this.nodeCache = new NodeCache( { checkperiod: 120 } );;
	}

	cacheExpireTime = global.config_data.cache.cacheExpireTime //OPS expire time
	cacheEnabled = global.config_data.cache.cacheEnabled  //en/dis global caching
	units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	cacheReset() {
		this.nodeCache.flushAll();
		return true;
	}

	cacheStats() {
		const stats = this.nodeCache.getStats();
		return stats;
	}
	
	cacheKeys(next) {
		const keys = this.nodeCache.keys();
		return keys;
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


