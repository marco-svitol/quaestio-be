const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const utils=require('../../utils');

exports.searchbookmark = async(req, res) => {
	res.setHeader('Content-Type', 'application/json')
    res.status(200).send(fakeres);
}

const fakeres=`
[
    {
        "doc_num": "CN115735042A",
        "type": "epodoc",
        "familyid": "72241304",
        "country": "CN",
        "invention_title": "Door or window having movable leaf as sliding leaf or movable lifting-sliding leaf and drive device",
        "date": "20230303",
        "abstract": "A door or window (3) having: a movable lift-pull leaf (2); a protective frame (4) in which the leaf (2) is held in a liftable and displaceable manner; and a drive device (1), the drive device (1) having an electric drive motor (5) arranged on the wing side for moving the wing (2) with a threaded spindle (6) driven thereon and being placed as a formed structural unit in a housing (11), the driving device (1) is forcibly guided in a horizontally displaceable manner around a rack bar element (7) arranged on the protective frame (4) in a manner of being arranged on the protective frame (4); a vertical movement is permitted by the leaf (2) relative to the protective frame (4) by means of a recess or receiving groove (8) of a horizontal beam (9) positioned almost completely in a covering manner in the installation position of the leaf (2) in the protective frame (4) and in a guide rail (10) provided on the protective frame (4), a battery (12) being mounted on the lifting-sliding leaf (2), the invention relates to a window or door (3) having a storage battery (14) which is in electrical contact with the drive (1) and which, in the closed and open state of the window or door (3), bridges the electrical contact with the drive (1) on the protective frame (4) or in the building wall (43) by means of a contactor (13) having a contact point (14) in the extension of the rack element (7), the contact point (14) forming a groove (17), a groove (17) for the insertion of a contact piece (18) which is arranged on the drive (1) and has a contact point (15) when the leaf (2) is lifted, pushed and pulled by a horizontal movement of the electric drive motor (5), the groove (17) being open in the direction of the contact piece (14) on the side facing away from the protective frame (4).",
        "applicant": "SIEGENIA AUBI KG",
        "inventor_name": "ANDREAS EIFEL (+2)",
        "ops_link": "https://worldwide.espacenet.com/patent/search/family/familyid/publication/CN115735042A?q=pn%3DCN115735042A",
        "read_history": "new",
        "bookmark": true
    },
    {
        "doc_num": "EP3940179A1",
        "type": "epodoc",
        "familyid": "72612776",
        "country": "EP",
        "invention_title": "DOOR OR WINDOW WITH A SLIDABLE WING AS A SLIDING WING OR A SLIDING HANDLE SLIDING DOOR AND A DRIVE DEVICE",
        "date": "20220119",
        "abstract": "Tür oder Fenster 3 mit einem verschiebbaren Hebe-Schiebeflügel 2, einem Blendrahmen 4, in dem der Flügel 2 heb- und verschiebbar gehalten ist, und einer Antriebsvorrichtung 1, wobei die Antriebsvorrichtung 1 zum Verschieben des Flügels 2 einen flügelseitig angeordneten elektrischen Antriebsmotor 5 mit einer daran angetriebenen Gewindespindel 6 umfasst und als eine Baueinheit bildend in einem Gehäuse 11 gelagert sind, dass die Antriebsvorrichtung 1 am Blendrahmen 4 angeordnet um ein am Blendrahmen 4 aufweisendes Zahnstangenelement 7 horizontal verstellbar zwangsgeführt ist, und mit Einbaulage des Flügels 2 in den Blendrahmen 4 nahezu vollständig in einer Ausnehmung oder Aufnahmenut 8 eines oberen, horizontalen Holms 9 des Flügels 2 und einer am Blendrahmen 4 angeordneten Führungsschiene 10 verdeckt positioniert eine mit dem Flügel 2 zum Blendrahmen 4 vertikale Verschiebung erlaubt, wobei dass eine zum Blendrahmen 4 hin weisende Seite 32 der Antriebsvorrichtung 1 in horizontaler Richtung verschiebbar antriebsverbunden mit den am Blendrahmen 4 befestigten Bauteilen steht und mit einer zum Hebe-Schiebeflügel 2 orientierten Seite 33 der Antriebsvorrichtung 1 von einem offenen Ende 34, 35 des oberen horizontalen Holms 9 des Hebe-Schiebeflügels 2 in die Ausnehmung oder Aufnahmenut 8 einführbar ist, wobei die Antriebsvorrichtung 1 an jeweiligen längsseitigen Enden 19, 20 des Gehäuses 11 in horizontaler Längsrichtung von einem Begrenzungs- und Befestigungsteil 21, 21'; 22, 22' Lage positioniert gehalten ist und in vertikaler Richtung ein gleitendes Verschieben durch das am beweglichen Hebe-Schiebeflügel 2 befestigte Begrenzungs- und Befestigungsteil 21, 21'; 22, 22' zulässt.",
        "applicant": "SIEGENIA AUBI KG [DE]",
        "inventor_name": "EIFEL ANDREAS [DE] (+4)",
        "ops_link": "https://worldwide.espacenet.com/patent/search/family/familyid/publication/EP3940179A1?q=pn%3DEP3940179A1",
        "read_history": "viewed",
        "bookmark": true
    },
    {
        "doc_num": "WO2020249361A1",
        "type": "epodoc",
        "familyid": "67848587",
        "country": "WO",
        "invention_title": "LIFT-AND-SLIDE WINDOW OR DOOR FOR A BUILDING, HAVING A GUIDING AND DAMPING DEVICE ARRANGED ON THE SLIDING SASH",
        "date": "20201217",
        "abstract": "The invention relates to a window or door (1) for a building, having a sliding sash (2) and a frame (3), comprising a guiding and damping device (4) of the movable sash (2) provided with an operating rod fitting (5) and designed as a lift-and-slide window and/or lift-and-slide door, which guiding and damping device is arranged on the sliding sash (2), also comprising a C-shaped or U-shaped guide rail (6) which is arranged on the frame (3) of the window or of the door (1) and which, by means of at least one guide element (7), enables the movement of the window or door (1) having the sliding sash (2). The guiding and damping device (4) comprises at least two guide members (8, 9) which are mounted in a movement gap (15) formed on an upper face of a horizontal bar (10) of the sliding sash (2), projecting beyond the outer faces (11, 12) of the guiding and damping device (4) and the corresponding inner faces (13, 14) of the guide rail (6). With the adjustment of the operating rod fitting (5), the sliding sash (2) moves relative to the frame (3) from a raised position into a lowered position, and the guide members (8), (9) move out of a first sliding state of the raised position of the sliding sash (2) relative to the frame (3), with lowering of the sliding sash (2) relative to the frame (3), into a second clamping state in which the guide members (8, 9) lying adjacent to one another close the movement gap (15) in a clamping manner and fix the sliding sash (2) in a braked manner in the guide rail (6).",
        "applicant": "SIEGENIA AUBI KG [DE]",
        "inventor_name": "BERENS WOLFGANG [DE] (+4)",
        "ops_link": "https://worldwide.espacenet.com/patent/search/family/familyid/publication/WO2020249361A1?q=pn%3DWO2020249361A1",
        "read_history": "new",
        "bookmark": true
    }
]
`