//const { stream } = require('../logger');
const { REFUSED } = require('dns');
const logger=require('../logger'); 
const msgServerError = 'Server error';
const randomQuote = require ('random-quotes');


async function getCurrentHPAmaxReplicas(){
	//const hpa = await api.readNamespacedHorizontalPodAutoscaler(hpaname, namespace);
	return 1;
}

exports.test = async (req, res) => { 
	logger.srvconsoledir(req,start=0);
	res.status(200).send({quote: randomQuote.default().body, author: randomQuote.default().author})
}

const testreponse = [
        {
            "invention_title": "Automated Vacuum Cleaner",
            "doc_num": "US100001",
            "inventor_name": "John Smith",
            "date": "2022-01-01",
            "ops_link": "https://www.example.com/autovacuum"
        },
        {
            "invention_title": "Smart Thermostat",
            "doc_num": "US100002",
            "inventor_name": "Jane Doe",
            "date": "2022-02-01",
            "ops_link": "https://www.example.com/smartthermo"
        },
        {
            "invention_title": "Self-Driving Car",
            "doc_num": "US100003",
            "inventor_name": "Bob Johnson",
            "date": "2022-03-01",
            "ops_link": "https://www.example.com/selfdrivingcar"
        },
        {
            "invention_title": "Virtual Reality Headset",
            "doc_num": "US100050",
            "inventor_name": "Sam Wilson",
            "date": "2022-12-01",
            "ops_link": "https://www.example.com/vrheadset"
        },
        {
            "invention_title": "Smart Grill",
            "doc_num": "US100051",
            "inventor_name": "Mark Brown",
            "date": "2023-01-01",
            "ops_link": "https://www.example.com/smartgrill"
        },
        {
            "invention_title": "Drone Delivery",
            "doc_num": "US100052",
            "inventor_name": "Emily Davis",
            "date": "2023-01-15",
            "ops_link": "https://www.example.com/dronedelivery"
        },
        {
            "invention_title": "Smart Lock",
            "doc_num": "US100053",
            "inventor_name": "Michael Miller",
            "date": "2023-02-01",
            "ops_link": "https://www.example.com/smartlock"
        },
        {
            "invention_title": "3D Printer",
            "doc_num": "US100054",
            "inventor_name": "Jessica Wilson",
            "date": "2023-03-01",
            "ops_link": "https://www.example.com/3dprinter"
        },
        {
            "invention_title": "Intelligent Robot",
            "doc_num": "US100055",
            "inventor_name": "Matthew Thompson",
            "date": "2023-04-01",
            "ops_link": "https://www.example.com/intelligentrobot"
		},
		{
			"invention_title": "Smart Watch",
			"doc_num": "US100056",
			"inventor_name": "Daniel Garcia",
			"date": "2023-05-01",
			"ops_link": "https://www.example.com/smartwatch"
		},
		{
			"invention_title": "Smart Luggage",
			"doc_num": "US100057",
			"inventor_name": "David Martinez",
			"date": "2023-06-01",
			"ops_link": "https://www.example.com/smartluggage"
		},
		{
			"invention_title": "Smart Pill Dispenser",
			"doc_num": "US100058",
			"inventor_name": "James Rodriguez",
			"date": "2023-07-01",
			"ops_link": "https://www.example.com/smartpilldispenser"
		},
		{
			"invention_title": "Smart Thermometer",
			"doc_num": "US100059",
			"inventor_name": "Jose Hernandez",
			"date": "2023-08-01",
			"ops_link": "https://www.example.com/smartthermometer"
		},
		{
			"invention_title": "Smart Irrigation System",
			"doc_num": "US100060",
			"inventor_name": "Maria Perez",
			"date": "2023-09-01",
			"ops_link": "https://www.example.com/smartirrigation"
		},
		{
			"invention_title": "Smart Refrigerator",
			"doc_num": "US100061",
			"inventor_name": "Margaret Anderson",
			"date": "2023-10-01",
			"ops_link": "https://www.example.com/smartrefrigerator"
		},
		{
			"invention_title": "Smart Scale",
			"doc_num": "US100062",
			"inventor_name": "Brian Jackson",
			"date": "2023-11-01",
			"ops_link": "https://www.example.com/smartscale"
		},
		{
			"invention_title": "Smart Water Bottle",
			"doc_num": "US100063",
			"inventor_name": "Carol Martinez",
			"date": "2023-12-01",
			"ops_link": "https://www.example.com/smartwaterbottle"
		},
		{
			"invention_title": "Smart Air Purifier",
			"doc_num": "US100064",
			"inventor_name": "Nancy Rodriguez",
			"date": "2023-12-15",
			"ops_link": "https://www.example.com/smartairpurifier"
		},
		{
			"invention_title": "Smart Coffee Maker",
			"doc_num": "US100065",
			"inventor_name": "Jane Smith",
			"date": "2024-01-01",
			"ops_link": "https://www.example.com/smartcoffeemaker"
		},
		{
			"invention_title": "Smart Showerhead",
			"doc_num": "US100066",
			"inventor_name": "Adam Johnson",
			"date": "2024-02-01",
			"ops_link": "https://www.example.com/smartshowerhead"
		},
		{
			"invention_title": "Smart Water Sensor",
			"doc_num": "US100067",
			"inventor_name": "Ashley Williams",
			"date": "2024-03-01",
			"ops_link": "https://www.example.com/smartwatersensor"
		},
		{
			"invention_title": "Smart Power Strip",
			"doc_num": "US100068",
			"inventor_name": "Michael Brown",
			"date": "2024-04-01",
			"ops_link": "https://www.example.com/smartpowerstrip"
		},
		{
			"invention_title": "Smart Plant Sensor",
			"doc_num": "US100069",
			"inventor_name": "Jessica Davis",
			"date": "2024-05-01",
			"ops_link": "https://www.example.com/smartplantsensor"
		},
		{
			"invention_title": "Smart Mattress",
			"doc_num": "US100070",
			"inventor_name": "Matthew Miller",
			"date": "2024-06-01",
			"ops_link": "https://www.example.com/smartmattress"
		}
	]
	
exports.search = async(req, res) => {
	logger.srvconsoledir(req, start=0);
	res.status(200).json(testreponse); 
}