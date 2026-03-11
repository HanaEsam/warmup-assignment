const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================

// helper function to convert to time to seconds when am/pm
function timeToSeconds(timeStr) {
    timeStr = timeStr.trim().toLowerCase();
    const period = timeStr.includes("pm") ? "pm" : "am";
    const timePart = timeStr.replace("am", "").replace("pm", "").trim();
    const [h, m, s] = timePart.split(":").map(Number);
    
    let hours = h;
    if (period === "am" && hours === 12) hours = 0;      
    if (period === "pm" && hours !== 12) hours += 12;
    
    return hours * 3600 + m * 60 + s;
}
// helper func to return it back to standard time format
function timeToNormal(totoalSec){
    const hours= Math.floor(totoalSec/3600);
    const min=Math.floor((totoalSec%3600)/60);
    const sec= totoalSec%60;

    
    return `${hours}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
// helper to coverts duration overall into seconds (no am/pm)
function durationToSeconds(durationStr) {
    const [h, m, s] = durationStr.trim().split(":").map(Number);
    return h * 3600 + m * 60 + s;
}
// helper to parse the shiftt info
function parseShifts(textFile){
    const content= fs.readFileSync(textFile,"utf8");
    const lines = content.split("\n").filter(l=> l.trim()!=="");//remove any empty lines
    
    return lines.map((line) => {
        const parts = line.split(",").map(p => p.trim()); // extra spaces are removed
        return {
            driverID: parts[0],
            driverName: parts[1],
            date: parts[2],
            startTime: parts[3],
            endTime: parts[4],
            shiftDuration: parts[5],
            idleTime: parts[6],
            activeTime: parts[7],
            metQuota: parts[8] === "true",
            hasBonus: parts[9] === "true"
        };
    });
}
//helper add new shift into the file 
function shiftsToText(shifts){
    return shifts.map((r) => {
        return `${r.driverID},${r.driverName},${r.date},${r.startTime},${r.endTime},${r.shiftDuration},${r.idleTime},${r.activeTime},${r.metQuota},${r.hasBonus}`;
    }).join("\n");
}

// helper to convert day name to string 
function getDayName(dateStr) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d));
    return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
//helper to read the .txt  read the rates
function parseRates(rateFile) {
    const content = fs.readFileSync(rateFile, "utf8");
    const lines = content.split("\n").filter(l => l.trim() !== "");
    return lines.map(line => {
        const parts = line.split(",").map(p => p.trim());
        return {
            driverID: parts[0],
            dayOff: parts[1],
            basePay: parseInt(parts[2]),
            tier: parseInt(parts[3])
        };
    });
}
function getShiftDuration(startTime, endTime) {
  
   const startt= timeToSeconds(startTime);
   const endt= timeToSeconds(endTime);
   let difference = endt-startt;
    if (difference < 0) {
    difference += 24 * 3600;
    }
   return timeToNormal(difference);


}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let idle=0;

    const start= timeToSeconds(startTime);
    const end= timeToSeconds(endTime);
    const deliveryStart = 8 * 3600;   // 8am covert to seconds
    const deliveryEnd = 22 * 3600;    // 10pm convert to seconds
    if(start<deliveryStart){
        idle+= deliveryStart-start;
    }
    if(end>deliveryEnd){
        idle+=end - deliveryEnd;
    }
    return timeToNormal(idle);

}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const shiftinSec = durationToSeconds(shiftDuration);
    const idleinSec= durationToSeconds(idleTime);
    const activeTime = shiftinSec-idleinSec;

    return timeToNormal(activeTime);
    
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const [year, month, day] = date.split("-").map(Number);
    const activeTimeinSec= durationToSeconds(activeTime);
    if(year === 2025 && month === 4 && day >= 10 && day <= 30){ //check the EId al fitr period
       return (activeTimeinSec>=6*3600);
    }else {
        return (activeTimeinSec>= (8*3600)+(24*60));

    }

}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ===========================================g=================
function addShiftRecord(textFile, shiftObj) {
    const { driverID, driverName, date, startTime, endTime } = shiftObj;
    //reads the exisiting records 
    const shifts = parseShifts(textFile);

    const duplicate = shifts.find(r => r.driverID === driverID && r.date === date);
    if (duplicate)
        return {};
    const shiftDuration= getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime= getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime= getActiveTime(shiftDuration, idleTime);
    const quota= metQuota(date,activeTime);

    const newRecord = {
    driverID: driverID,
    driverName: driverName,
    date: date,
    startTime: startTime,
    endTime: endTime,
    shiftDuration: shiftDuration,
    idleTime: idleTime,
    activeTime: activeTime,
    metQuota: quota,
    hasBonus: false
};
//to find driverID 
const lastIndex = shifts.reduce((acc, r, i) => {
    return r.driverID === driverID ? i : acc;
}, -1);
if (lastIndex === -1) {
    
    shifts.push(newRecord);
} else {
    
    shifts.splice(lastIndex + 1, 0, newRecord);
}
fs.writeFileSync(textFile, shiftsToText(shifts), "utf8");
    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    
    const shifts = parseShifts(textFile);
    
    const idx = shifts.findIndex(r => r.driverID === driverID && r.date === date);//returns index
    
    if (idx === -1) return; // if record not found do nothing
    
    shifts[idx].hasBonus = newValue; // updates the record
    
    fs.writeFileSync(textFile, shiftsToText(shifts), "utf8");
}


// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
   const shifts = parseShifts(textFile);
    
    // get all records of this driver
    const driverRecords = shifts.filter(r => r.driverID === driverID);
    

    // if no records found → return -1
    if (driverRecords.length === 0) return -1;
    
    // count records where month matches AND hasBonus is true
    const targetMonth = parseInt(month, 10);
    return driverRecords.filter(r => {
        const recordMonth =  parseInt(r.date.split("-")[1], 10);
        return recordMonth === targetMonth &&  r.hasBonus==true ;// check hasBonus
    }).length;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
        const shifts= parseShifts(textFile);
        const targetMon= parseInt(month,10);//10 is base 10 converts it 
        const filtered= shifts.filter(r=>{
        const recMon=  parseInt(r.date.split("-")[1], 10);;
        return r.driverID === driverID && recMon === targetMon;
    })
    const totalSec = filtered.reduce((sum, r) => {
        return sum + durationToSeconds(r.activeTime); // convert each activeTime to seconds
    }, 0);
    
    
    return timeToNormal(totalSec);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================


function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const shifts = parseShifts(textFile);
    const rates = parseRates(rateFile);
    const targetMonth = parseInt(month, 10);

    // find driver's day off
    const rateRecord = rates.find(r => r.driverID === driverID);
    if (!rateRecord) return "0:00:00";
    const dayOff = rateRecord.dayOff;

    // exclude wrong driver, wrong month, day off
    const relevant = shifts.filter(r => {
        if (r.driverID !== driverID) return false;
        if (parseInt(r.date.split("-")[1], 10) !== targetMonth) return false;
        if (getDayName(r.date) === dayOff) return false;
        return true;
    });

    // sum required hours
    let totalSec = relevant.reduce((sum, r) => {
        const [y, mo, d] = r.date.split("-").map(Number);
        const quotaSec = (y === 2025 && mo === 4 && d >= 10 && d <= 30)
            ? 6 * 3600
            : (8 * 3600) + (24 * 60);
        return sum + quotaSec;
    }, 0);

    // subtract 2 hours per bonus
    totalSec = totalSec - (bonusCount * 2 * 3600);
    totalSec = Math.max(0, totalSec);
    return timeToNormal(totalSec);
}



// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    const acH = durationToSeconds(actualHours);
    const reqH= durationToSeconds(requiredHours);
    const rates= parseRates(rateFile);
    const rateRecord = rates.find(r => r.driverID === driverID);
    if (!rateRecord) return 0;

    if(acH>= reqH){
        return rateRecord.basePay;
    }
    const missingHours= reqH - acH;
    const allowedHours = { 1: 50, 2: 20, 3: 10, 4: 3 }; 
    const allowed = allowedHours[rateRecord.tier];
    const allowedSec= allowed*3600;
    const billableSec = Math.max(0,missingHours- allowedSec);
    const billableHours= Math.floor(billableSec/3600);

    const deductionPerHour= Math.floor(rateRecord.basePay/185);
    const deduction =billableHours*deductionPerHour;

    return rateRecord.basePay-deduction;



}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
