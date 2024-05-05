module.exports = class OpsFairUseMonitoring {
    constructor(){
      this._usage = {
        hourUsedBytes : 0,
        weekUsedBytes : 0
      }
      this._throttling = {
        systemState : "",
        images : { semaphore : "",allowedReqPerMinute : 0,},
        inpadoc : {semaphore : "",allowedReqPerMinute : 0,},
        other : {semaphore : "",allowedReqPerMinute : 0,},
        retrieval : {semaphore : "",allowedReqPerMinute : 0,},
        search : {semaphore : "",allowedReqPerMinute : 0,}
      }
  
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
    };
  
    updateMonitoring (opsHeader) {
      this._updateUsage (opsHeader["x-individualquotaperhour-used"],opsHeader["x-registeredquotaperweek-used"] );
      this._updateThrottling(opsHeader["x-throttling-control"]);
    }
  
    getUsageMB(){
        const hourUsedMB = this._bytesToMB(this._usage.hourUsedBytes);
        const weekUsedMB = this._bytesToMB(this._usage.weekUsedBytes);
        return {
            hourUsedMB : hourUsedMB,
            hourUsedPercent : (hourUsedMB*100/global.config_data.ops.quotas.hourly).toFixed(2),
            weekUsedMB : weekUsedMB,
            weekUsedPercent : (weekUsedMB*100/global.config_data.ops.quotas.week).toFixed(2)
        }
    }
  
    getThrottling(){
      return this._throttling;
    }
  }