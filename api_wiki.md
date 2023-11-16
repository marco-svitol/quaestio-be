 # `GET` **/auth/login** : user authentication

version: 1

parameters:

|Name|Description|
|----|-----------|
|username*||
|password*||

responses:
|Code|Description|
|----|-----------|
|200|Ok|
|401|Unauthorized|
|400|Invalid or missing username or password|


responses content example:

```
[
  {
    "uid" : 423
    "token" : "12345678qwerty",
    "reftoken" : "qwerty12345678"
  }
]
```
 # `GET` **/auth/refreshtoken** : refresh api token key using the refresh token
version: 1

parameters:

|Name|Description|
|----|-----------|
|uid*|user id|
|reftoken*|refresh token|

responses:
|Code|Description|
|----|-----------|
|200|Ok|
|401|Unauthorized|
|400|Invalid or missing parameters|


responses content example:

```
[
  {
    "token" : "ssswww12345678"
  }
]
```
-------
# Authorization
## The auth key (aka API token) must be provided in the request's Header using the "Authorization" key and the Bearer token value. You may also want to add the "Accept" key to specify wich data type you are allowed to accept in the response: 

            Authorization : "Bearer this_is_a_token",
            Accept : 'application/json, application/pdf, application/jpeg, application/gif'
##  _All the following methods require an authorization key_ :
 ----------------
 # `GET` **/userprofile** : returns user's relevant data to prepare the search page
 version: 2

parameters:

|Name|Description|
|----|-----------|
|uid*|user id|

responses:
|Code|Description|
|----|-----------|
|200|Ok|
|400|Userid not valid|

 responses example:
 ```
[
    {
        "searchvalues": {
            "applicants": [
                {
                    "id": "1",
                    "name": "JOHNNY"
                },
                {
                    "id": "2",
                    "name": "GEPPO"
                },
               ...
            ],
            "tecareas": [
                {
                    "id": "1",
                    "name": "Flying Cars"
                },
                {
                    "id": "2",
                    "name": "Motus perpetuus"
                },
                ...
            ]
        },
        "userinfo":{
            "displayname": "acme",
            "logopath": 'https://core.windows.net/quaestio/logo_default'
        }
    }
]
```
 # `GET` **/search** : search patent documents
version: 2

parameters:

|Name|Description|
|----|-----------|
|uid*|user id|
|pa*|patent's applicant id|
|tecarea*|patent tech area id|
|txt|search text pattern|
|pdfrom|starting date. Date format must match YYYYMMDD|
|pdto|ending date. Format as above|
|beginRange**|<strike>if not specified, at most 50 documents will be sent as a result. If specified, the results will be sent in set of ResultsPerPage** starting from beginRange. This is used for pagination.</strike>|

\* One of pa or tecarea must be present. Other parameters are optional.

\** Feature currently not implemented 

ResultsPerPage is currently 12. In future versions will be customizable per user.


responses:
|Code|Description|
|----|-----------|
|200|Ok|
|400|Parameters are invalid or missing|



responses content example:

```
[
    {
      "abstract": "A machine to travel in the past and in the future",
      "applicant": "Emmmet INC.",
      "bookmark": true,
      "country": 'DE',
      "date": '20230602',
      "doc_num": "BR.112020019905.A2",
      "familyid": "8256708",
      "invention_title" : "Time machine",
      "inventor_name" : "Emmett Brown",
      "ops_link" : "https://ops.abcd.com/doc/1234asd",
      "read_history" : "new",
      "type": "docdb",
    },
    {
      ...
    },
    ....
    {
        "userinfo": {
            "throttling-control": [
                [
                    "idle"
                ],
                [
                    "images",
                    "green:200"
                ],
                [
                    "inpadoc",
                    "green:60,"
                ],
                [
                    "other",
                    "green:1000,"
                ],
                [
                    "retrieval",
                    "green:200,"
                ],
                [
                    "search",
                    "green:30"
                ]
            ],
            "individualquotaperhour-used": "541368",
            "registeredquotaperweek-used": "1567113"
        }
    },
    {
        "resultsinfo": {
            "total_count" : "631",
            "range": {
                "begin": 1,
                "end": 12
            }
        } 
    }
]

```
|read_history|Description|
|------------|-----------|
|new|It's the first time this doc is shown in the results|
|listed|This doc was already listed previously but not viewed|
|viewed|This doc has already been opened| 
----------------
 # `GET` **/opendoc** : returns URL to OPS original doc and list of available images (drawings)
version: 2

parameters:

|Name|Description|
|----|-----------|
|uid*|user id|
|doc_num|Document identification code|

responses:
|Code|Description|
|----|-----------|
|200|Ok|

responses content example:

```
[
  {
    "ops_link" : "https://worldwide.espacenet.com/patent/search/family/85988853/publication/WO2023064419A1?q=pn%3DWO2023064419A1",
    "images_links" : [
        {
            "desc": "FullDocument",
            "nofpages": "62",
            "format": "pdf",
            "link": "published-data/images/WO/2023064419/A1/fullimage"
        },
        {
            "desc": "Drawing",
            "nofpages": "6",
            "format": "pdf",
            "link": "published-data/images/WO/2023064419/A1/thumbnail"
        },
        {
            "desc": "FirstPageClipping",
            "nofpages": "1",
            "format": "png",
            "link": "published-data/images/WO/2023064419/PA/firstpage"
        }
        ...
    ],
    "userinfo": {
        "throttling-control": [
            [
                "idle"
            ],
            [
                "images",
                "green:200"
            ],
            [
                "inpadoc",
                "green:60,"
            ],
            [
                "other",
                "green:1000,"
            ],
            [
                "retrieval",
                "green:200,"
            ],
            [
                "search",
                "green:30"
            ]
        ],
        "individualquotaperhour-used": "278556",
        "registeredquotaperweek-used": "6195630"
     }
  }
]

```
 ----------------
 # `GET` **/firstpageClipping** : returns the modal image
version: 2

parameters:

|Name|Description|
|----|-----------|
|uid*|user id|
|fpcImage* |link to the image as it was provided by the _opendoc_ API. `i.e.: published-data/images/WO/2023064419/PA/firstpage` |
|fpcImageFormat*|format of the image : png, jpg, pdf, tiff. Should match the format specified by the response of _opendoc_

responses:
|Code|Description|
|----|-----------|
|200|Ok|

response: a **binary stream** of data containing the image data.