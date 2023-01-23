const axios=require('axios');

module.exports = class opsService{
  constructor() {
    this.authData = {
      grant_type : 'client_credentials'
    };
    this.authOptions = {
      baseURL: `${process.env.OPSBASEURL}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.OPSCLIENTID+":"+process.env.OPSCLIENTSECRET,'utf8').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    };
    this.commonOptions = {
      baseURL: `${process.env.OPSBASEURL}`,
      headers: ""
    };
    this.authResponse = null;
    this.authAxiosInstance = axios.create(this.authOptions);
    this.commonAxiosInstance = null; 
    this.authParams = new URLSearchParams(this.authData);
    this.authParams.append('extraparam', 'value');
  }

  async refreshToken(next){
    this.authAxiosInstance.post("/auth/accesstoken", this.authParams)
      .then((response) => {
        this.authResponse=response.data;
        this.commonOptions.headers = {
          'Authorization': `Bearer ${this.authResponse.access_token}`
        }
        this.commonAxiosInstance = axios.create(this.commonOptions);
        return next(null);
      })
      .catch((err) => {
        return next(err);
      })
  }

  async publishedDataSearch(strQuery, next){
    
    this.commonAxiosInstance.get("/rest-services/published-data/search?q="+strQuery)
    .then((response) => {
      return next(null, response.data);
    })
    .catch((err) => {
      return next(err, null);  
    })
  }
}





