const logger = require("../logger");

module.exports = class OpsFairUseMonitoring {
  constructor() {
    
    this._usage = {
      hourUsedBytes: 0,
      weekUsedBytes: 0
    };

    this._throttling = {
      systemState: "idle",
      images: { semaphore: "green", allowedReqPerMinute: 200, },
      inpadoc: { semaphore: "green", allowedReqPerMinute: 60, },
      other: { semaphore: "green", allowedReqPerMinute: 1000, },
      retrieval: { semaphore: "green", allowedReqPerMinute: 200, },
      search: { semaphore: "green", allowedReqPerMinute: 30, }
    };

    this._frequency = {};

    this._timeStamp = {};

    this._bytesToMB = (bytes) => {
      return (bytes / 1024 / 1024).toFixed(2);
    }

    this._updateUsage = (hourUsedBytes, weekUsedBytes) => {
      this._usage.hourUsedBytes = hourUsedBytes;
      this._usage.weekUsedBytes = weekUsedBytes;
    }

    this._updateThrottling = (throttling) => {
      const systemStateRegex = /(.+)\s+\(.+\)/;
      const semaphoreRegex = /(\w+)=(\w+):(\d+)/g;

      const systemStateMatch = throttling.match(systemStateRegex);
      if (systemStateMatch) {
        this._throttling.systemState = systemStateMatch[1].trim();

        let match;
        while ((match = semaphoreRegex.exec(throttling)) !== null) {
          const [, key, color, reqPerMinute] = match;
          this._throttling[key].semaphore = color;
          this._throttling[key].allowedReqPerMinute = parseInt(reqPerMinute);
        }
      }
    }

    this._getCurrentUnixMinute = () => {
      return Math.floor(Date.now() / (1000 * 60));
    }
  };

  updateMonitoring(opsHeader, serviceName) {
    this._updateUsage(opsHeader["x-individualquotaperhour-used"], opsHeader["x-registeredquotaperweek-used"]);
    this._updateThrottling(opsHeader["x-throttling-control"]);
    this.trackServiceFreq(serviceName);
    this.setServiceTimeStamp(serviceName);
  }

  getUsageMB() {
    const hourUsedMB = this._bytesToMB(this._usage.hourUsedBytes);
    const weekUsedMB = this._bytesToMB(this._usage.weekUsedBytes);
    return {
      hourUsedMB: hourUsedMB,
      hourUsedPercent: (hourUsedMB * 100 / global.config_data.ops.quotas.hourly).toFixed(2),
      weekUsedMB: weekUsedMB,
      weekUsedPercent: (weekUsedMB * 100 / global.config_data.ops.quotas.week).toFixed(2)
    }
  }

  getThrottling() {
    return this._throttling;
  }

  getAllowedServiceFreq(serviceName) {
    const service = this._throttling[serviceName];
    if (service) {
      return service.allowedReqPerMinute;
    } else {
      return null;
    }
  }

  getServiceLight(serviceName) {
    const service = this._throttling[serviceName];
    if (service) {
      return service.semaphore;
    } else {
      return null;
    }
  }

  setServiceTimeStamp(serviceName) {
      this._timeStamp[serviceName] = Date.now();
  }

  getServiceTimeStamp(serviceName) {
    return this._timeStamp[serviceName] || null;
  }

  trackServiceFreq(serviceName) {
    // Get the current minute
    const currentMinute = this._getCurrentUnixMinute();

    // Reset the frequency count for the current minute if it's a new minute
    if (!this._frequency[currentMinute]) {
        this._frequency[currentMinute] = {};
    }

    // Initialize the frequency count for the given service if it doesn't exist
    if (!this._frequency[currentMinute][serviceName]) {
        this._frequency[currentMinute][serviceName] = 0;
    }

    // Increment the frequency count for the given service and current minute
    this._frequency[currentMinute][serviceName]++;
    
    // Clear the counts for previous minutes to save memory
    const previousMinute = (currentMinute - 1 + 60) % 60; // Handle wraparound for previous hour
    delete this._frequency[previousMinute];
  }

  getServiceFreq(serviceName) {
    // Get the current minute
    const currentMinute = this._getCurrentUnixMinute();

    // Check if the given service has recorded frequency for the current minute
    if (this._frequency[currentMinute] && this._frequency[currentMinute][serviceName]) {
        // Return the frequency for the given service in the current minute
        return this._frequency[currentMinute][serviceName];
    } else {
        // If no frequency recorded for the current minute, return 0
        return 0;
    }
  }

  getSecondsToWaitHard(serviceName) {
    
    const serviceLight = this.getServiceLight(serviceName)
    
    if (serviceLight === 'green'){
      return 0
    }

    const allowedFreq = this.getAllowedServiceFreq(serviceName);
    if (allowedFreq === null) {
        return null; // Service not found in throttling configuration
    }

    const currentFreq = this.getServiceFreq(serviceName);
    const secondsInMinute = 60;

    // Calculate how many seconds you need to wait before executing the next call
    const secondsToWait = (currentFreq >= allowedFreq) ? (secondsInMinute - new Date().getSeconds()) : 0;
    
    return secondsToWait;
  }

  getSecondsToWait(serviceName) {
    
    const serviceLight = this.getServiceLight(serviceName)
    const allowedFreq = this.getAllowedServiceFreq(serviceName);
    let factor = 1;

    switch (serviceLight) {
      case 'green':
        return 0;
      case 'yellow':
        factor = 1.2;
        break;
      case 'red':
        factor = 2;
        break;
      case 'black': {
        logger.error (`OPS blocked us :(. Wait until ${this.getHMFromNow(600)}`);
        const error = new Error(`OPS blocked us :(. Wait until ${this.getHMFromNow(600)}`);
        error.status = 503; // HTTP status 403 Forbidden
        throw (error);
      }
    }

    // Calculate the total seconds to wait based on the allowed frequency
    const totalSecondsToWait = (60 / allowedFreq) * factor;

    // Get the last timestamp of the service
    const lastTimeStamp = this.getServiceTimeStamp(serviceName);

    // If there is no timestamp for the service, return 0 (no need to wait)
    if (!lastTimeStamp) {
        return 0;
    }

    // Calculate the elapsed time since the last timestamp
    const elapsedTimeInSeconds = (Date.now() - lastTimeStamp) / 1000;

    // Calculate the remaining seconds to wait by subtracting the elapsed time from the total wait time
    const remainingSecondsToWait = Math.max(totalSecondsToWait - elapsedTimeInSeconds, 0);

    return remainingSecondsToWait;
  }

  getHMFromNow(seconds){
    // Get the current time
    const currentTime = new Date();

    // Calculate the time 10 minutes from now
    const futureTime = new Date(currentTime.getTime() + (seconds * 1000)); // Adding 10 minutes in milliseconds

    // Extract the hours and minutes from the future time
    const futureHour = futureTime.getHours();
    const futureMinute = futureTime.getMinutes();

    // Format the time
    return futureTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  identifyServiceFromURL(URL) {
    if (URL.startsWith('/rest-services/published-data/search')){
      return 'search';
    }

    if (URL.startsWith('/rest-services/family/') || URL.startsWith('/rest-services/legal/')){
      return 'inpadoc';
    }

    if (URL.startsWith('/rest-services/published-data/images') || URL.startsWith('/rest-services/classification/cpc/media')){
      return 'images';
    }

    if (URL.startsWith('/rest-services/published-data/')){
      return 'retrieval';
    }

    return 'other';
  }
}
