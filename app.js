const EMAILJS_CONFIG = {
  // Fill these 3 values from your EmailJS account to send real appointment emails.
  PUBLIC_KEY: "YOUR_EMAILJS_PUBLIC_KEY",
  SERVICE_ID: "YOUR_EMAILJS_SERVICE_ID",
  TEMPLATE_ID: "YOUR_EMAILJS_TEMPLATE_ID",
  TO_EMAIL: "soltech238@gmail.com"
};

const DB_KEY = "hms_soltech_database_v1";
const defaultData = {
  patients: [],
  doctors: [
    {doctor_id:"D001",name:"Dr. Sharma",specialization:"General Physician",qualification:"MBBS, MD",phone:"9876543210",available_days:"Mon, Tue, Wed, Fri",fee:500},
    {doctor_id:"D002",name:"Dr. Mehta",specialization:"Cardiologist",qualification:"MBBS, MD, DM",phone:"9876501234",available_days:"Tue, Thu, Sat",fee:1000},
    {doctor_id:"D003",name:"Dr. Patil",specialization:"Orthopedic",qualification:"MBBS, MS",phone:"9823456789",available_days:"Mon, Wed, Sat",fee:700}
  ],
  appointments: [],
  medicines: [
    {medicine_id:"M001",name:"Paracetamol 500mg",category:"Tablet",quantity:120,price:2.5,expiry_date:"2027-06-30",status:"In Stock"},
    {medicine_id:"M002",name:"Azithromycin 500mg",category:"Tablet",quantity:18,price:12,expiry_date:"2027-03-31",status:"Low Stock"},
    {medicine_id:"M003",name:"ORS",category:"Sachet",quantity:0,price:20,expiry_date:"2027-08-31",status:"Out of Stock"}
  ],
  labs: [],
  beds: [
    {bed_number:"B-101",ward:"General",status:"Available",patient_name:"",daily_charge:1200},
    {bed_number:"B-102",ward:"General",status:"Occupied",patient_name:"Rahul More",daily_charge:1200},
    {bed_number:"ICU-01",ward:"ICU",status:"Available",patient_name:"",daily_charge:3500},
    {bed_number:"P-201",ward:"Private",status:"Available",patient_name:"",daily_charge:2500},
    {bed_number:"ER-01",ward:"Emergency",status:"Reserved",patient_name:"",daily_charge:1800}
  ],
  bills: []
};
const state = loadDB();

function loadDB(){
  try{
    const saved = JSON.parse(localStorage.getItem(DB_KEY));
    if(saved) return Object.assign(structuredClone(defaultData), saved);
  }catch(e){ console.warn(e); }
  const fresh = structuredClone(defaultData);
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function makeId(prefix){return prefix+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase()}
function api(action, method="GET", data=null){
  return new Promise((resolve,reject)=>{
    try{
      let result={};
      switch(action){
        case "all": result=state; break;
        case "patient_add": {
          const pid=makeId("P");
          state.patients.unshift({...data,patient_id:pid});
          saveDB(); result={patient_id:pid}; break;
        }
        case "patient_update": {
          const i=state.patients.findIndex(x=>x.patient_id===data.patient_id);
          if(i<0) throw Error("Patient not found.");
          state.patients[i]={...state.patients[i],...data}; saveDB(); break;
        }
        case "patient_delete": {
          state.patients=state.patients.filter(x=>x.patient_id!==data.patient_id); saveDB(); break;
        }
        case "doctor_add": {
          const id=makeId("D"); state.doctors.unshift({...data,doctor_id:id}); saveDB(); result={doctor_id:id}; break;
        }
        case "doctor_update": {
          const i=state.doctors.findIndex(x=>x.doctor_id===data.doctor_id);
          if(i<0) throw Error("Doctor not found.");
          state.doctors[i]={...state.doctors[i],...data}; saveDB(); break;
        }
        case "doctor_delete": {
          state.doctors=state.doctors.filter(x=>x.doctor_id!==data.doctor_id); saveDB(); break;
        }
        case "appointment_add": {
          const id=makeId("A");
          const appointment={...data,appointment_id:id,status:"Booked"};
          state.appointments.unshift(appointment); saveDB();
          sendAppointmentEmail(appointment).then(ok=>{
            result={appointment_id:id,email_sent:ok};
            resolve({success:true,data:result});
          }).catch(()=>{
            result={appointment_id:id,email_sent:false};
            resolve({success:true,data:result});
          });
          return;
        }
        case "medicine_add": {
          const id=makeId("M"); state.medicines.unshift({...data,medicine_id:id}); saveDB(); result={medicine_id:id}; break;
        }
        case "medicine_update": {
          const i=state.medicines.findIndex(x=>x.medicine_id===data.medicine_id);
          if(i<0) throw Error("Medicine not found.");
          state.medicines[i]={...state.medicines[i],...data}; saveDB(); break;
        }
        case "medicine_delete": {
          state.medicines=state.medicines.filter(x=>x.medicine_id!==data.medicine_id); saveDB(); break;
        }
        case "lab_add": {
          const id=makeId("L"); state.labs.unshift({...data,lab_id:id}); saveDB(); result={lab_id:id}; break;
        }
        case "bed_add": {
          if(state.beds.some(x=>x.bed_number===data.bed_number)) throw Error("Bed number already exists.");
          state.beds.push({...data}); saveDB(); break;
        }
        case "bill_add": {
          const id=makeId("B"); state.bills.unshift({...data,bill_id:id}); saveDB(); result={bill_id:id}; break;
        }
        default: throw Error("Unknown action");
      }
      resolve({success:true,data:result});
    }catch(e){reject(e)}
  });
}

async function sendAppointmentEmail(a){
  const ready = EMAILJS_CONFIG.PUBLIC_KEY &&
    !EMAILJS_CONFIG.PUBLIC_KEY.startsWith("YOUR_") &&
    EMAILJS_CONFIG.SERVICE_ID && !EMAILJS_CONFIG.SERVICE_ID.startsWith("YOUR_") &&
    EMAILJS_CONFIG.TEMPLATE_ID && !EMAILJS_CONFIG.TEMPLATE_ID.startsWith("YOUR_");
  if(!ready || !window.emailjs){
    toast("Appointment saved. Configure EmailJS in app.js for automatic email.");
    return false;
  }
  try{
    emailjs.init({publicKey:EMAILJS_CONFIG.PUBLIC_KEY});
    await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
      to_email: EMAILJS_CONFIG.TO_EMAIL,
      appointment_id: a.appointment_id,
      patient_name: a.patient_name,
      patient_phone: a.patient_phone,
      doctor_name: a.doctor_name,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      reason: a.reason || "",
      message: `New hospital appointment ${a.appointment_id}. Patient: ${a.patient_name}. Doctor: ${a.doctor_name}. Date: ${a.appointment_date}. Time: ${a.appointment_time}. Phone: ${a.patient_phone}. Reason: ${a.reason || "Not provided"}.`
    });
    return true;
  }catch(err){
    console.error("EmailJS error:",err);
    toast("Appointment saved, but email could not be sent. Check EmailJS settings.");
    return false;
  }
}
function setPage(p){state.page=p;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===p));$("#pageTitle").textContent=pages[p];$("#content").innerHTML=render(p);bindPage();if(innerWidth<901)$("#sidebar").classList.remove("open")}
function render(p){
 if(p==="dashboard")return dashboard();
 if(p==="patients")return patients();
 if(p==="doctors")return doctors();
 if(p==="appointments")return appointments();
 if(p==="medicines")return medicines();
 if(p==="laboratory")return laboratory();
 if(p==="beds")return beds();
 if(p==="billing")return billing();
 return searchPage();
}
function dashboard(){
 const today=new Date().toISOString().slice(0,10);
 const todays=state.appointments.filter(x=>x.appointment_date===today).length;
 const avail=state.beds.filter(x=>x.status==="Available").length;
 const pending=state.bills.filter(x=>x.payment_status!=="Paid").length;
 return `<div class="welcome"><div><h2>Welcome to Hospital Management System</h2><p>Manage patients, doctors, appointments, laboratory, beds and billing from one place.</p></div><div class="hero-badge">♥</div></div>
 <div class="stat-grid">
  ${stat("♙","Total Patients",state.patients.length)}
  ${stat("⚕","Total Doctors",state.doctors.length)}
  ${stat("▣","Today's Appointments",todays)}
  ${stat("▤","Available Beds",avail)}
  ${stat("₹","Pending Bills",pending)}
 </div>
 <div class="split">
  <div class="section-card"><div class="section-head">Recent Appointments <button class="btn btn-light" onclick="setPage('appointments')">View All</button></div><div class="section-body">${appointmentMini()}</div></div>
  <div class="section-card"><div class="section-head">Hospital Services</div><div class="section-body"><div class="service-grid">
   ${service("♙","Patient Care","Registration, records and patient history.")}
   ${service("⚕","Doctor Consultation","Doctor scheduling and availability.")}
   ${service("⌬","Laboratory","Test requests and report tracking.")}
   ${service("▤","IPD / Beds","Admission and bed availability.")}
  </div></div></div>
 </div>
 <div class="section-card"><div class="section-head">Weekly Appointment Activity</div><div class="section-body"><div class="chart">${[48,72,58,88,64,79,52].map((n,i)=>`<div class="bar" style="height:${n}%"><small>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</small></div>`).join("")}</div></div></div>`;
}
function stat(icon,label,value){return `<div class="stat-card"><div class="stat-top"><div class="stat-icon">${icon}</div></div><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`}
function service(i,h,p){return `<div class="service"><div class="service-icon">${i}</div><h3>${h}</h3><p>${p}</p></div>`}
function appointmentMini(){if(!state.appointments.length)return `<div class="empty">No appointments yet.</div>`;return `<div class="mini-list">${state.appointments.slice(0,5).map(a=>`<div class="mini-row"><div class="mini-left"><div class="avatar">${esc((a.patient_name||"P")[0])}</div><div><b>${esc(a.patient_name)}</b><div class="muted">${esc(a.doctor_name)} · ${esc(a.appointment_date)} ${esc(a.appointment_time)}</div></div></div><span class="pill ${a.status==="Booked"?"green":"orange"}">${esc(a.status||"Booked")}</span></div>`).join("")}</div>`}

function patients(){return `<div class="section-card"><div class="section-head">Add / Update Patient</div><div class="section-body"><form id="patientForm"><input type="hidden" id="patientId"><div class="form-grid">
 ${field("Name","patientName","text","Enter patient name",true)}${field("Phone","patientPhone","tel","10-digit mobile",true)}
 ${field("Age","patientAge","number","Age",true)}${selectField("Gender","patientGender",["Male","Female","Other"],true)}
 ${field("Address","patientAddress","text","Address",true)}${selectField("Blood Group","patientBlood",["A+","A-","B+","B-","AB+","AB-","O+","O-"],true)}
 ${field("Date of Birth","patientDob","date","",false)}${field("Emergency Contact","patientEmergency","tel","Optional")}
 </div><div class="actions"><button class="btn btn-primary" type="submit">＋ Add Patient</button><button class="btn btn-success" type="button" id="updatePatient">✎ Update</button><button class="btn btn-danger" type="button" id="deletePatient">▣ Delete</button><button class="btn btn-secondary" type="button" id="clearPatient">↻ Clear</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Patient Records <div class="search-box"><input id="patientSearch" placeholder="Search by name or Patient ID"><button class="btn btn-primary" type="button">⌕</button></div></div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Blood</th><th>Address</th><th>Action</th></tr></thead><tbody id="patientRows">${patientRows(state.patients)}</tbody></table></div></div>`}
function patientRows(arr){if(!arr.length)return `<tr><td colspan="8" class="empty">No patient records.</td></tr>`;return arr.map(p=>`<tr><td>${esc(p.patient_id)}</td><td>${esc(p.name)}</td><td>${esc(p.age)}</td><td>${esc(p.gender)}</td><td>${esc(p.phone)}</td><td>${esc(p.blood_group)}</td><td>${esc(p.address)}</td><td><div class="table-actions"><button class="btn btn-primary" onclick="editPatient('${esc(p.patient_id)}')">Edit</button><button class="btn btn-danger" onclick="removePatient('${esc(p.patient_id)}')">Delete</button></div></td></tr>`).join("")}
function editPatient(id){const p=state.patients.find(x=>x.patient_id===id);if(!p)return;["patientId","patientName","patientPhone","patientAge","patientGender","patientAddress","patientBlood","patientDob","patientEmergency"].forEach(k=>{const el=$("#"+k);if(el)el.value=p[{patientId:"patient_id",patientName:"name",patientPhone:"phone",patientAge:"age",patientGender:"gender",patientAddress:"address",patientBlood:"blood_group",patientDob:"dob",patientEmergency:"emergency_contact"}[k]]||""});window.scrollTo({top:0,behavior:"smooth"})}
async function removePatient(id){if(!confirm("Delete this patient?"))return;try{await api("patient_delete","POST",{patient_id:id});await refresh();toast("Patient deleted.")}catch(e){toast(e.message)}}
function clearPatient(){["patientId","patientName","patientPhone","patientAge","patientGender","patientAddress","patientBlood","patientDob","patientEmergency"].forEach(k=>{const e=$("#"+k);if(e)e.value=""})}

function doctors(){return `<div class="section-card"><div class="section-head">Add / Update Doctor</div><div class="section-body"><form id="doctorForm"><input type="hidden" id="doctorId"><div class="form-grid">
 ${field("Doctor Name","doctorName","text","Dr. Full Name",true)}${field("Specialization","doctorSpecialization","text","e.g. Cardiologist",true)}
 ${field("Qualification","doctorQualification","text","e.g. MBBS, MD",true)}${field("Phone","doctorPhone","tel","10-digit mobile",true)}
 ${field("Available Days","doctorDays","text","Mon, Wed, Fri",true)}${field("Consultation Fee","doctorFee","number","₹",true)}
 </div><div class="actions"><button class="btn btn-primary" type="submit">＋ Add Doctor</button><button class="btn btn-success" type="button" id="updateDoctor">✎ Update</button><button class="btn btn-danger" type="button" id="deleteDoctor">▣ Delete</button><button class="btn btn-secondary" type="button" id="clearDoctor">↻ Clear</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Doctor Records</div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Specialization</th><th>Qualification</th><th>Phone</th><th>Days</th><th>Fee</th><th>Action</th></tr></thead><tbody>${doctorRows(state.doctors)}</tbody></table></div></div>`}
function doctorRows(arr){if(!arr.length)return `<tr><td colspan="8" class="empty">No doctors found.</td></tr>`;return arr.map(d=>`<tr><td>${esc(d.doctor_id)}</td><td>${esc(d.name)}</td><td>${esc(d.specialization)}</td><td>${esc(d.qualification)}</td><td>${esc(d.phone)}</td><td>${esc(d.available_days)}</td><td>₹${esc(d.fee)}</td><td><div class="table-actions"><button class="btn btn-primary" onclick="editDoctor('${esc(d.doctor_id)}')">Edit</button><button class="btn btn-danger" onclick="removeDoctor('${esc(d.doctor_id)}')">Delete</button></div></td></tr>`).join("")}
function editDoctor(id){const d=state.doctors.find(x=>x.doctor_id===id);if(!d)return;const map={doctorId:"doctor_id",doctorName:"name",doctorSpecialization:"specialization",doctorQualification:"qualification",doctorPhone:"phone",doctorDays:"available_days",doctorFee:"fee"};Object.keys(map).forEach(k=>$("#"+k).value=d[map[k]]||"");window.scrollTo({top:0,behavior:"smooth"})}
async function removeDoctor(id){if(!confirm("Delete this doctor?"))return;try{await api("doctor_delete","POST",{doctor_id:id});await refresh();toast("Doctor deleted.")}catch(e){toast(e.message)}}
function clearDoctor(){["doctorId","doctorName","doctorSpecialization","doctorQualification","doctorPhone","doctorDays","doctorFee"].forEach(k=>$("#"+k).value="")}

function appointments(){return `<div class="section-card"><div class="section-head">Appointment Booking</div><div class="section-body"><form id="appointmentForm"><div class="form-grid">
 ${field("Patient Name","appointmentPatient","text","Patient full name",true)}${doctorSelect()}
 ${field("Patient Phone","appointmentPhone","tel","Mobile number",true)}${field("Appointment Date","appointmentDate","date","",true)}
 ${field("Appointment Time","appointmentTime","time","",true)}${field("Reason / Symptoms","appointmentReason","text","Optional")}
 </div><div class="notice">When an appointment is booked, the complete appointment information is saved in the database and the system attempts to send an email notification to <b>soltech238@gmail.com</b>.</div><div class="actions"><button class="btn btn-primary" type="submit">▣ Book Appointment</button><button class="btn btn-secondary" type="reset">↻ Clear</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Appointment Records</div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Phone</th><th>Date</th><th>Time</th><th>Status</th></tr></thead><tbody>${appointmentRows(state.appointments)}</tbody></table></div></div>`}
function doctorSelect(){return `<div class="field"><label>Doctor Name *</label><select id="appointmentDoctor" required><option value="">Select Doctor</option>${state.doctors.map(d=>`<option value="${esc(d.doctor_id)}" data-name="${esc(d.name)}">${esc(d.name)} — ${esc(d.specialization)}</option>`).join("")}</select></div>`}
function appointmentRows(a){if(!a.length)return `<tr><td colspan="7" class="empty">No appointments found.</td></tr>`;return a.map(x=>`<tr><td>${esc(x.appointment_id)}</td><td>${esc(x.patient_name)}</td><td>${esc(x.doctor_name)}</td><td>${esc(x.patient_phone)}</td><td>${esc(x.appointment_date)}</td><td>${esc(x.appointment_time)}</td><td><span class="pill green">${esc(x.status||"Booked")}</span></td></tr>`).join("")}

function medicines(){return `<div class="section-card"><div class="section-head">Medicine Inventory</div><div class="section-body"><form id="medicineForm"><input type="hidden" id="medicineId"><div class="form-grid three">
 ${field("Medicine Name","medicineName","text","Name",true)}${field("Category","medicineCategory","text","Tablet / Syrup / Injection",true)}${field("Quantity","medicineQty","number","Units",true)}
 ${field("Price","medicinePrice","number","Per unit",true)}${field("Expiry Date","medicineExpiry","date","",true)}${selectField("Stock Status","medicineStatus",["In Stock","Low Stock","Out of Stock"],true)}
 </div><div class="actions"><button class="btn btn-primary" type="submit">＋ Add Medicine</button><button class="btn btn-success" type="button" id="updateMedicine">✎ Update</button><button class="btn btn-danger" type="button" id="deleteMedicine">▣ Delete</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Medicine Records</div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Medicine</th><th>Category</th><th>Quantity</th><th>Price</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead><tbody>${medicineRows(state.medicines)}</tbody></table></div></div>`}
function medicineRows(a){if(!a.length)return `<tr><td colspan="8" class="empty">No medicines found.</td></tr>`;return a.map(m=>`<tr><td>${esc(m.medicine_id)}</td><td>${esc(m.name)}</td><td>${esc(m.category)}</td><td>${esc(m.quantity)}</td><td>₹${esc(m.price)}</td><td>${esc(m.expiry_date)}</td><td><span class="pill ${m.status==="In Stock"?"green":m.status==="Low Stock"?"orange":"red"}">${esc(m.status)}</span></td><td><div class="table-actions"><button class="btn btn-primary" onclick="editMedicine('${esc(m.medicine_id)}')">Edit</button><button class="btn btn-danger" onclick="removeMedicine('${esc(m.medicine_id)}')">Delete</button></div></td></tr>`).join("")}
function editMedicine(id){const m=state.medicines.find(x=>x.medicine_id===id);if(!m)return;const map={medicineId:"medicine_id",medicineName:"name",medicineCategory:"category",medicineQty:"quantity",medicinePrice:"price",medicineExpiry:"expiry_date",medicineStatus:"status"};Object.keys(map).forEach(k=>$("#"+k).value=m[map[k]]||"")}
async function removeMedicine(id){if(!confirm("Delete this medicine?"))return;try{await api("medicine_delete","POST",{medicine_id:id});await refresh();toast("Medicine deleted.")}catch(e){toast(e.message)}}

function laboratory(){return `<div class="section-card"><div class="section-head">Laboratory Test Entry</div><div class="section-body"><form id="labForm"><div class="form-grid">
 ${field("Patient Name","labPatient","text","Patient name",true)}${field("Test Name","labTest","text","CBC, X-Ray, Blood Sugar...",true)}
 ${field("Test Date","labDate","date","",true)}${field("Report Status","labStatus","text","Pending / Completed",true)}
 ${field("Result / Notes","labResult","text","Optional result summary")}
 </div><div class="actions"><button class="btn btn-primary" type="submit">＋ Save Lab Record</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Laboratory Reports</div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Patient</th><th>Test</th><th>Date</th><th>Status</th><th>Result</th></tr></thead><tbody>${state.labs.length?state.labs.map(l=>`<tr><td>${esc(l.lab_id)}</td><td>${esc(l.patient_name)}</td><td>${esc(l.test_name)}</td><td>${esc(l.test_date)}</td><td><span class="pill ${l.status==="Completed"?"green":"orange"}">${esc(l.status)}</span></td><td>${esc(l.result||"-")}</td></tr>`).join(""):`<tr><td colspan="6" class="empty">No laboratory records.</td></tr>`}</tbody></table></div></div>`}

function beds(){return `<div class="section-card"><div class="section-head">IPD / Bed Management</div><div class="section-body"><form id="bedForm"><div class="form-grid three">
 ${field("Bed Number","bedNumber","text","e.g. B-101",true)}${selectField("Ward","bedWard",["General","ICU","Private","Semi-Private","Emergency"],true)}${selectField("Status","bedStatus",["Available","Occupied","Cleaning","Reserved"],true)}
 ${field("Patient Name","bedPatient","text","If occupied")} ${field("Daily Charge","bedCharge","number","₹",true)}
 </div><div class="actions"><button class="btn btn-primary" type="submit">＋ Save Bed</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Bed Records</div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>Bed</th><th>Ward</th><th>Status</th><th>Patient</th><th>Daily Charge</th></tr></thead><tbody>${state.beds.length?state.beds.map(b=>`<tr><td>${esc(b.bed_number)}</td><td>${esc(b.ward)}</td><td><span class="pill ${b.status==="Available"?"green":b.status==="Occupied"?"red":"orange"}">${esc(b.status)}</span></td><td>${esc(b.patient_name||"-")}</td><td>₹${esc(b.daily_charge)}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">No beds found.</td></tr>`}</tbody></table></div></div>`}

function billing(){return `<div class="section-card"><div class="section-head">Create Patient Bill</div><div class="section-body"><form id="billForm"><div class="form-grid three">
 ${field("Patient Name","billPatient","text","Patient name",true)}${field("Consultation Charges","billConsult","number","₹",true)}${field("Medicine Charges","billMedicine","number","₹",true)}
 ${field("Laboratory Charges","billLab","number","₹",true)}${field("Room / Bed Charges","billRoom","number","₹",true)}${selectField("Payment Status","billStatus",["Pending","Paid","Partially Paid"],true)}
 </div><div class="notice"><b>Total:</b> ₹<span id="billTotal">0.00</span></div><div class="actions"><button class="btn btn-primary" type="submit">₹ Save Bill</button><button class="btn btn-secondary" type="button" id="printBill">▣ Print Bill</button></div></form></div></div>
 <div class="section-card"><div class="section-head">Billing Records</div><div class="section-body table-wrap"><table class="data-table"><thead><tr><th>Bill ID</th><th>Patient</th><th>Consultation</th><th>Medicine</th><th>Lab</th><th>Room</th><th>Total</th><th>Status</th></tr></thead><tbody>${state.bills.length?state.bills.map(b=>`<tr><td>${esc(b.bill_id)}</td><td>${esc(b.patient_name)}</td><td>₹${esc(b.consultation)}</td><td>₹${esc(b.medicine)}</td><td>₹${esc(b.laboratory)}</td><td>₹${esc(b.room_charge)}</td><td><b>₹${esc(b.total)}</b></td><td><span class="pill ${b.payment_status==="Paid"?"green":"orange"}">${esc(b.payment_status)}</span></td></tr>`).join(""):`<tr><td colspan="8" class="empty">No bills found.</td></tr>`}</tbody></table></div></div>`}

function searchPage(){return `<div class="section-card"><div class="section-head">Search Patient</div><div class="section-body"><div class="search-box"><input id="globalSearch" placeholder="Enter patient name, ID or phone"><button class="btn btn-primary" id="globalSearchBtn">⌕ Search</button></div><div id="searchResults" style="margin-top:18px"></div></div></div>`}
function field(label,id,type="text",placeholder="",required=false){return `<div class="field"><label>${label}${required?" *":""}</label><input id="${id}" type="${type}" placeholder="${placeholder}" ${required?"required":""}></div>`}
function selectField(label,id,opts,required=false){return `<div class="field"><label>${label}${required?" *":""}</label><select id="${id}" ${required?"required":""}><option value="">Select ${label}</option>${opts.map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>`}

function bindPage(){
 const forms=document.querySelectorAll("form");forms.forEach(f=>f.addEventListener("submit",async e=>{e.preventDefault();await submitForm(f.id)}));
 if($("#updatePatient"))$("#updatePatient").onclick=()=>updatePatient();
 if($("#deletePatient"))$("#deletePatient").onclick=()=>{const id=$("#patientId").value;if(id)removePatient(id);else toast("Select a patient first.")};
 if($("#clearPatient"))$("#clearPatient").onclick=clearPatient;
 if($("#patientSearch"))$("#patientSearch").oninput=()=>{$("#patientRows").innerHTML=patientRows(state.patients.filter(p=>(p.name+" "+p.patient_id).toLowerCase().includes($("#patientSearch").value.toLowerCase())))};
 if($("#updateDoctor"))$("#updateDoctor").onclick=()=>updateDoctor();
 if($("#deleteDoctor"))$("#deleteDoctor").onclick=()=>{const id=$("#doctorId").value;if(id)removeDoctor(id);else toast("Select a doctor first.")};
 if($("#clearDoctor"))$("#clearDoctor").onclick=clearDoctor;
 if($("#updateMedicine"))$("#updateMedicine").onclick=()=>updateMedicine();
 if($("#deleteMedicine"))$("#deleteMedicine").onclick=()=>{const id=$("#medicineId").value;if(id)removeMedicine(id);else toast("Select a medicine first.")};
 ["billConsult","billMedicine","billLab","billRoom"].forEach(id=>{if($("#"+id))$("#"+id).oninput=calcBill});
 if($("#printBill"))$("#printBill").onclick=()=>window.print();
 if($("#globalSearchBtn"))$("#globalSearchBtn").onclick=globalSearch;
}
async function submitForm(id){
 try{
  if(id==="patientForm"){await api("patient_add","POST",{name:$("#patientName").value,age:$("#patientAge").value,gender:$("#patientGender").value,phone:$("#patientPhone").value,address:$("#patientAddress").value,blood_group:$("#patientBlood").value,dob:$("#patientDob").value,emergency_contact:$("#patientEmergency").value});await refresh();toast("Patient added successfully.");}
  if(id==="doctorForm"){await api("doctor_add","POST",{name:$("#doctorName").value,specialization:$("#doctorSpecialization").value,qualification:$("#doctorQualification").value,phone:$("#doctorPhone").value,available_days:$("#doctorDays").value,fee:$("#doctorFee").value});await refresh();toast("Doctor added successfully.");}
  if(id==="appointmentForm"){const s=$("#appointmentDoctor").selectedOptions[0];await api("appointment_add","POST",{patient_name:$("#appointmentPatient").value,doctor_id:$("#appointmentDoctor").value,doctor_name:s?.dataset.name||"",patient_phone:$("#appointmentPhone").value,appointment_date:$("#appointmentDate").value,appointment_time:$("#appointmentTime").value,reason:$("#appointmentReason").value});await refresh();toast("Appointment booked successfully. Email notification attempted.");}
  if(id==="medicineForm"){await api("medicine_add","POST",{name:$("#medicineName").value,category:$("#medicineCategory").value,quantity:$("#medicineQty").value,price:$("#medicinePrice").value,expiry_date:$("#medicineExpiry").value,status:$("#medicineStatus").value});await refresh();toast("Medicine added successfully.");}
  if(id==="labForm"){await api("lab_add","POST",{patient_name:$("#labPatient").value,test_name:$("#labTest").value,test_date:$("#labDate").value,status:$("#labStatus").value,result:$("#labResult").value});await refresh();toast("Laboratory record saved.");}
  if(id==="bedForm"){await api("bed_add","POST",{bed_number:$("#bedNumber").value,ward:$("#bedWard").value,status:$("#bedStatus").value,patient_name:$("#bedPatient").value,daily_charge:$("#bedCharge").value});await refresh();toast("Bed record saved.");}
  if(id==="billForm"){const c=+$("#billConsult").value||0,m=+$("#billMedicine").value||0,l=+$("#billLab").value||0,r=+$("#billRoom").value||0;await api("bill_add","POST",{patient_name:$("#billPatient").value,consultation:c,medicine:m,laboratory:l,room_charge:r,payment_status:$("#billStatus").value,total:c+m+l+r});await refresh();toast("Bill saved successfully.");}
 }catch(e){toast(e.message)}
}
async function updatePatient(){const id=$("#patientId").value;if(!id)return toast("Select a patient first.");try{await api("patient_update","POST",{patient_id:id,name:$("#patientName").value,age:$("#patientAge").value,gender:$("#patientGender").value,phone:$("#patientPhone").value,address:$("#patientAddress").value,blood_group:$("#patientBlood").value,dob:$("#patientDob").value,emergency_contact:$("#patientEmergency").value});await refresh();toast("Patient updated.")}catch(e){toast(e.message)}}
async function updateDoctor(){const id=$("#doctorId").value;if(!id)return toast("Select a doctor first.");try{await api("doctor_update","POST",{doctor_id:id,name:$("#doctorName").value,specialization:$("#doctorSpecialization").value,qualification:$("#doctorQualification").value,phone:$("#doctorPhone").value,available_days:$("#doctorDays").value,fee:$("#doctorFee").value});await refresh();toast("Doctor updated.")}catch(e){toast(e.message)}}
async function updateMedicine(){const id=$("#medicineId").value;if(!id)return toast("Select a medicine first.");try{await api("medicine_update","POST",{medicine_id:id,name:$("#medicineName").value,category:$("#medicineCategory").value,quantity:$("#medicineQty").value,price:$("#medicinePrice").value,expiry_date:$("#medicineExpiry").value,status:$("#medicineStatus").value});await refresh();toast("Medicine updated.")}catch(e){toast(e.message)}}
function calcBill(){const n=id=>+($("#"+id)?.value)||0;const total=n("billConsult")+n("billMedicine")+n("billLab")+n("billRoom");if($("#billTotal"))$("#billTotal").textContent=total.toFixed(2)}
async function globalSearch(){const q=$("#globalSearch").value.trim().toLowerCase();const a=state.patients.filter(p=>(p.patient_id+" "+p.name+" "+p.phone).toLowerCase().includes(q));$("#searchResults").innerHTML=a.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Blood</th><th>Address</th></tr></thead><tbody>${patientRows(a).replaceAll(/<td>.*?<\/td><td><div class="table-actions">.*?<\/div><\/td>/g,"")}</tbody></table></div>`:`<div class="empty">No matching patient found.</div>`}
async function refresh(){await loadData();setPage(state.page)}
setInterval(()=>{$("#clock").textContent=new Date().toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})},1000);
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.page)));
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
loadData().then(()=>setPage("dashboard"));
