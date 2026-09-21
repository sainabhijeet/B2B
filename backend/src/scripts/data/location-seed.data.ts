/**
 * Flat rows: one primary city + postal sample per state/region.
 * Expand via CSV import in production for full pincode directories.
 */
export type LocationSeedRow = {
  countryIso: string;
  stateCode: string;
  stateName: string;
  cityName: string;
  postalCode: string;
};

/** India — all 28 states + 8 union territories (ISO-style codes). */
const IN: LocationSeedRow[] = [
  { countryIso: 'IN', stateCode: 'AP', stateName: 'Andhra Pradesh', cityName: 'Vijayawada', postalCode: '520001' },
  { countryIso: 'IN', stateCode: 'AR', stateName: 'Arunachal Pradesh', cityName: 'Itanagar', postalCode: '791111' },
  { countryIso: 'IN', stateCode: 'AS', stateName: 'Assam', cityName: 'Guwahati', postalCode: '781001' },
  { countryIso: 'IN', stateCode: 'BR', stateName: 'Bihar', cityName: 'Patna', postalCode: '800001' },
  { countryIso: 'IN', stateCode: 'CG', stateName: 'Chhattisgarh', cityName: 'Raipur', postalCode: '492001' },
  { countryIso: 'IN', stateCode: 'GA', stateName: 'Goa', cityName: 'Panaji', postalCode: '403001' },
  { countryIso: 'IN', stateCode: 'GJ', stateName: 'Gujarat', cityName: 'Ahmedabad', postalCode: '380001' },
  { countryIso: 'IN', stateCode: 'HR', stateName: 'Haryana', cityName: 'Gurugram', postalCode: '122001' },
  { countryIso: 'IN', stateCode: 'HP', stateName: 'Himachal Pradesh', cityName: 'Shimla', postalCode: '171001' },
  { countryIso: 'IN', stateCode: 'JH', stateName: 'Jharkhand', cityName: 'Ranchi', postalCode: '834001' },
  { countryIso: 'IN', stateCode: 'KA', stateName: 'Karnataka', cityName: 'Bengaluru', postalCode: '560001' },
  { countryIso: 'IN', stateCode: 'KL', stateName: 'Kerala', cityName: 'Kochi', postalCode: '682001' },
  { countryIso: 'IN', stateCode: 'MP', stateName: 'Madhya Pradesh', cityName: 'Bhopal', postalCode: '462001' },
  { countryIso: 'IN', stateCode: 'MH', stateName: 'Maharashtra', cityName: 'Mumbai', postalCode: '400001' },
  { countryIso: 'IN', stateCode: 'MN', stateName: 'Manipur', cityName: 'Imphal', postalCode: '795001' },
  { countryIso: 'IN', stateCode: 'ML', stateName: 'Meghalaya', cityName: 'Shillong', postalCode: '793001' },
  { countryIso: 'IN', stateCode: 'MZ', stateName: 'Mizoram', cityName: 'Aizawl', postalCode: '796001' },
  { countryIso: 'IN', stateCode: 'NL', stateName: 'Nagaland', cityName: 'Kohima', postalCode: '797001' },
  { countryIso: 'IN', stateCode: 'OR', stateName: 'Odisha', cityName: 'Bhubaneswar', postalCode: '751001' },
  { countryIso: 'IN', stateCode: 'PB', stateName: 'Punjab', cityName: 'Ludhiana', postalCode: '141001' },
  { countryIso: 'IN', stateCode: 'RJ', stateName: 'Rajasthan', cityName: 'Jaipur', postalCode: '302001' },
  { countryIso: 'IN', stateCode: 'SK', stateName: 'Sikkim', cityName: 'Gangtok', postalCode: '737101' },
  { countryIso: 'IN', stateCode: 'TN', stateName: 'Tamil Nadu', cityName: 'Chennai', postalCode: '600001' },
  { countryIso: 'IN', stateCode: 'TS', stateName: 'Telangana', cityName: 'Hyderabad', postalCode: '500001' },
  { countryIso: 'IN', stateCode: 'TR', stateName: 'Tripura', cityName: 'Agartala', postalCode: '799001' },
  { countryIso: 'IN', stateCode: 'UP', stateName: 'Uttar Pradesh', cityName: 'Lucknow', postalCode: '226001' },
  { countryIso: 'IN', stateCode: 'UK', stateName: 'Uttarakhand', cityName: 'Dehradun', postalCode: '248001' },
  { countryIso: 'IN', stateCode: 'WB', stateName: 'West Bengal', cityName: 'Kolkata', postalCode: '700001' },
  { countryIso: 'IN', stateCode: 'AN', stateName: 'Andaman and Nicobar Islands', cityName: 'Port Blair', postalCode: '744101' },
  { countryIso: 'IN', stateCode: 'CH', stateName: 'Chandigarh', cityName: 'Chandigarh', postalCode: '160001' },
  { countryIso: 'IN', stateCode: 'DH', stateName: 'Dadra and Nagar Haveli and Daman and Diu', cityName: 'Silvassa', postalCode: '396230' },
  { countryIso: 'IN', stateCode: 'DL', stateName: 'Delhi', cityName: 'New Delhi', postalCode: '110001' },
  { countryIso: 'IN', stateCode: 'JK', stateName: 'Jammu and Kashmir', cityName: 'Srinagar', postalCode: '190001' },
  { countryIso: 'IN', stateCode: 'LA', stateName: 'Ladakh', cityName: 'Leh', postalCode: '194101' },
  { countryIso: 'IN', stateCode: 'LD', stateName: 'Lakshadweep', cityName: 'Kavaratti', postalCode: '682555' },
  { countryIso: 'IN', stateCode: 'PY', stateName: 'Puducherry', cityName: 'Puducherry', postalCode: '605001' },
];

/** United States — 50 states + DC; capital city + ZIP. */
function cityRows(
  countryIso: string,
  stateCode: string,
  stateName: string,
  cities: string[],
): LocationSeedRow[] {
  return cities.map((cityName) => ({
    countryIso,
    stateCode,
    stateName,
    cityName,
    postalCode: '00000',
  }));
}

const IN_EXTRA: LocationSeedRow[] = [
  ...cityRows('IN', 'AP', 'Andhra Pradesh', ['Visakhapatnam', 'Guntur', 'Tirupati', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada']),
  ...cityRows('IN', 'AR', 'Arunachal Pradesh', ['Naharlagun', 'Pasighat', 'Tawang', 'Ziro']),
  ...cityRows('IN', 'AS', 'Assam', ['Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur', 'Nagaon', 'Tinsukia']),
  ...cityRows('IN', 'BR', 'Bihar', ['Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah']),
  ...cityRows('IN', 'CG', 'Chhattisgarh', ['Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon']),
  ...cityRows('IN', 'GA', 'Goa', ['Margao', 'Vasco da Gama', 'Mapusa', 'Ponda']),
  ...cityRows('IN', 'GJ', 'Gujarat', ['Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh']),
  ...cityRows('IN', 'HR', 'Haryana', ['Faridabad', 'Panipat', 'Hisar', 'Ambala', 'Karnal', 'Rohtak', 'Sonipat']),
  ...cityRows('IN', 'HP', 'Himachal Pradesh', ['Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Manali']),
  ...cityRows('IN', 'JH', 'Jharkhand', ['Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh']),
  ...cityRows('IN', 'KA', 'Karnataka', ['Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Ballari', 'Davangere', 'Shivamogga']),
  ...cityRows('IN', 'KL', 'Kerala', ['Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha']),
  ...cityRows('IN', 'MP', 'Madhya Pradesh', ['Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Satna']),
  ...cityRows('IN', 'MH', 'Maharashtra', ['Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur']),
  ...cityRows('IN', 'MN', 'Manipur', ['Thoubal', 'Churachandpur', 'Bishnupur', 'Ukhrul']),
  ...cityRows('IN', 'ML', 'Meghalaya', ['Tura', 'Jowai', 'Nongstoin']),
  ...cityRows('IN', 'MZ', 'Mizoram', ['Lunglei', 'Champhai', 'Serchhip']),
  ...cityRows('IN', 'NL', 'Nagaland', ['Dimapur', 'Mokokchung', 'Wokha']),
  ...cityRows('IN', 'OR', 'Odisha', ['Cuttack', 'Rourkela', 'Puri', 'Sambalpur', 'Berhampur', 'Balasore']),
  ...cityRows('IN', 'PB', 'Punjab', ['Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur']),
  ...cityRows('IN', 'RJ', 'Rajasthan', ['Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bharatpur', 'Sikar', 'Bhilwara', 'Pali', 'Tonk', 'Chittorgarh']),
  ...cityRows('IN', 'SK', 'Sikkim', ['Namchi', 'Gyalshing', 'Mangan']),
  ...cityRows('IN', 'TN', 'Tamil Nadu', ['Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore']),
  ...cityRows('IN', 'TS', 'Telangana', ['Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam']),
  ...cityRows('IN', 'TR', 'Tripura', ['Udaipur', 'Dharmanagar', 'Kailashahar']),
  ...cityRows('IN', 'UP', 'Uttar Pradesh', ['Kanpur', 'Varanasi', 'Agra', 'Noida', 'Ghaziabad', 'Prayagraj', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad']),
  ...cityRows('IN', 'UK', 'Uttarakhand', ['Haridwar', 'Haldwani', 'Roorkee', 'Rishikesh', 'Kashipur']),
  ...cityRows('IN', 'WB', 'West Bengal', ['Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Malda']),
  ...cityRows('IN', 'AN', 'Andaman and Nicobar Islands', ['Diglipur', 'Mayabunder']),
  ...cityRows('IN', 'DH', 'Dadra and Nagar Haveli and Daman and Diu', ['Daman', 'Diu']),
  ...cityRows('IN', 'DL', 'Delhi', ['Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh']),
  ...cityRows('IN', 'JK', 'Jammu and Kashmir', ['Jammu', 'Anantnag', 'Baramulla', 'Udhampur']),
  ...cityRows('IN', 'LA', 'Ladakh', ['Kargil']),
  ...cityRows('IN', 'LD', 'Lakshadweep', ['Agatti', 'Minicoy']),
  ...cityRows('IN', 'PY', 'Puducherry', ['Karaikal', 'Mahe', 'Yanam']),
];

const US: LocationSeedRow[] = [
  { countryIso: 'US', stateCode: 'AL', stateName: 'Alabama', cityName: 'Montgomery', postalCode: '36104' },
  { countryIso: 'US', stateCode: 'AK', stateName: 'Alaska', cityName: 'Juneau', postalCode: '99801' },
  { countryIso: 'US', stateCode: 'AZ', stateName: 'Arizona', cityName: 'Phoenix', postalCode: '85001' },
  { countryIso: 'US', stateCode: 'AR', stateName: 'Arkansas', cityName: 'Little Rock', postalCode: '72201' },
  { countryIso: 'US', stateCode: 'CA', stateName: 'California', cityName: 'Sacramento', postalCode: '95814' },
  { countryIso: 'US', stateCode: 'CO', stateName: 'Colorado', cityName: 'Denver', postalCode: '80202' },
  { countryIso: 'US', stateCode: 'CT', stateName: 'Connecticut', cityName: 'Hartford', postalCode: '06103' },
  { countryIso: 'US', stateCode: 'DE', stateName: 'Delaware', cityName: 'Dover', postalCode: '19901' },
  { countryIso: 'US', stateCode: 'FL', stateName: 'Florida', cityName: 'Tallahassee', postalCode: '32301' },
  { countryIso: 'US', stateCode: 'GA', stateName: 'Georgia', cityName: 'Atlanta', postalCode: '30303' },
  { countryIso: 'US', stateCode: 'HI', stateName: 'Hawaii', cityName: 'Honolulu', postalCode: '96813' },
  { countryIso: 'US', stateCode: 'ID', stateName: 'Idaho', cityName: 'Boise', postalCode: '83702' },
  { countryIso: 'US', stateCode: 'IL', stateName: 'Illinois', cityName: 'Springfield', postalCode: '62701' },
  { countryIso: 'US', stateCode: 'IN', stateName: 'Indiana', cityName: 'Indianapolis', postalCode: '46204' },
  { countryIso: 'US', stateCode: 'IA', stateName: 'Iowa', cityName: 'Des Moines', postalCode: '50309' },
  { countryIso: 'US', stateCode: 'KS', stateName: 'Kansas', cityName: 'Topeka', postalCode: '66603' },
  { countryIso: 'US', stateCode: 'KY', stateName: 'Kentucky', cityName: 'Frankfort', postalCode: '40601' },
  { countryIso: 'US', stateCode: 'LA', stateName: 'Louisiana', cityName: 'Baton Rouge', postalCode: '70802' },
  { countryIso: 'US', stateCode: 'ME', stateName: 'Maine', cityName: 'Augusta', postalCode: '04330' },
  { countryIso: 'US', stateCode: 'MD', stateName: 'Maryland', cityName: 'Annapolis', postalCode: '21401' },
  { countryIso: 'US', stateCode: 'MA', stateName: 'Massachusetts', cityName: 'Boston', postalCode: '02108' },
  { countryIso: 'US', stateCode: 'MI', stateName: 'Michigan', cityName: 'Lansing', postalCode: '48933' },
  { countryIso: 'US', stateCode: 'MN', stateName: 'Minnesota', cityName: 'Saint Paul', postalCode: '55102' },
  { countryIso: 'US', stateCode: 'MS', stateName: 'Mississippi', cityName: 'Jackson', postalCode: '39201' },
  { countryIso: 'US', stateCode: 'MO', stateName: 'Missouri', cityName: 'Jefferson City', postalCode: '65101' },
  { countryIso: 'US', stateCode: 'MT', stateName: 'Montana', cityName: 'Helena', postalCode: '59601' },
  { countryIso: 'US', stateCode: 'NE', stateName: 'Nebraska', cityName: 'Lincoln', postalCode: '68508' },
  { countryIso: 'US', stateCode: 'NV', stateName: 'Nevada', cityName: 'Carson City', postalCode: '89701' },
  { countryIso: 'US', stateCode: 'NH', stateName: 'New Hampshire', cityName: 'Concord', postalCode: '03301' },
  { countryIso: 'US', stateCode: 'NJ', stateName: 'New Jersey', cityName: 'Trenton', postalCode: '08608' },
  { countryIso: 'US', stateCode: 'NM', stateName: 'New Mexico', cityName: 'Santa Fe', postalCode: '87501' },
  { countryIso: 'US', stateCode: 'NY', stateName: 'New York', cityName: 'Albany', postalCode: '12207' },
  { countryIso: 'US', stateCode: 'NC', stateName: 'North Carolina', cityName: 'Raleigh', postalCode: '27601' },
  { countryIso: 'US', stateCode: 'ND', stateName: 'North Dakota', cityName: 'Bismarck', postalCode: '58501' },
  { countryIso: 'US', stateCode: 'OH', stateName: 'Ohio', cityName: 'Columbus', postalCode: '43215' },
  { countryIso: 'US', stateCode: 'OK', stateName: 'Oklahoma', cityName: 'Oklahoma City', postalCode: '73102' },
  { countryIso: 'US', stateCode: 'OR', stateName: 'Oregon', cityName: 'Salem', postalCode: '97301' },
  { countryIso: 'US', stateCode: 'PA', stateName: 'Pennsylvania', cityName: 'Harrisburg', postalCode: '17101' },
  { countryIso: 'US', stateCode: 'RI', stateName: 'Rhode Island', cityName: 'Providence', postalCode: '02903' },
  { countryIso: 'US', stateCode: 'SC', stateName: 'South Carolina', cityName: 'Columbia', postalCode: '29201' },
  { countryIso: 'US', stateCode: 'SD', stateName: 'South Dakota', cityName: 'Pierre', postalCode: '57501' },
  { countryIso: 'US', stateCode: 'TN', stateName: 'Tennessee', cityName: 'Nashville', postalCode: '37219' },
  { countryIso: 'US', stateCode: 'TX', stateName: 'Texas', cityName: 'Austin', postalCode: '78701' },
  { countryIso: 'US', stateCode: 'UT', stateName: 'Utah', cityName: 'Salt Lake City', postalCode: '84111' },
  { countryIso: 'US', stateCode: 'VT', stateName: 'Vermont', cityName: 'Montpelier', postalCode: '05602' },
  { countryIso: 'US', stateCode: 'VA', stateName: 'Virginia', cityName: 'Richmond', postalCode: '23219' },
  { countryIso: 'US', stateCode: 'WA', stateName: 'Washington', cityName: 'Olympia', postalCode: '98501' },
  { countryIso: 'US', stateCode: 'WV', stateName: 'West Virginia', cityName: 'Charleston', postalCode: '25301' },
  { countryIso: 'US', stateCode: 'WI', stateName: 'Wisconsin', cityName: 'Madison', postalCode: '53703' },
  { countryIso: 'US', stateCode: 'WY', stateName: 'Wyoming', cityName: 'Cheyenne', postalCode: '82001' },
  { countryIso: 'US', stateCode: 'DC', stateName: 'District of Columbia', cityName: 'Washington', postalCode: '20001' },
];

/** France — 18 régions (13 métropole + 5 outre-mer); préfecture + code postal. */
const FR: LocationSeedRow[] = [
  { countryIso: 'FR', stateCode: 'ARA', stateName: 'Auvergne-Rhône-Alpes', cityName: 'Lyon', postalCode: '69001' },
  { countryIso: 'FR', stateCode: 'BFC', stateName: 'Bourgogne-Franche-Comté', cityName: 'Dijon', postalCode: '21000' },
  { countryIso: 'FR', stateCode: 'BRE', stateName: 'Bretagne', cityName: 'Rennes', postalCode: '35000' },
  { countryIso: 'FR', stateCode: 'CVL', stateName: 'Centre-Val de Loire', cityName: 'Orléans', postalCode: '45000' },
  { countryIso: 'FR', stateCode: 'COR', stateName: 'Corse', cityName: 'Ajaccio', postalCode: '20000' },
  { countryIso: 'FR', stateCode: 'GES', stateName: 'Grand Est', cityName: 'Strasbourg', postalCode: '67000' },
  { countryIso: 'FR', stateCode: 'HDF', stateName: 'Hauts-de-France', cityName: 'Lille', postalCode: '59000' },
  { countryIso: 'FR', stateCode: 'IDF', stateName: 'Île-de-France', cityName: 'Paris', postalCode: '75001' },
  { countryIso: 'FR', stateCode: 'NOR', stateName: 'Normandie', cityName: 'Rouen', postalCode: '76000' },
  { countryIso: 'FR', stateCode: 'NAQ', stateName: 'Nouvelle-Aquitaine', cityName: 'Bordeaux', postalCode: '33000' },
  { countryIso: 'FR', stateCode: 'OCC', stateName: 'Occitanie', cityName: 'Toulouse', postalCode: '31000' },
  { countryIso: 'FR', stateCode: 'PDL', stateName: 'Pays de la Loire', cityName: 'Nantes', postalCode: '44000' },
  { countryIso: 'FR', stateCode: 'PAC', stateName: "Provence-Alpes-Côte d'Azur", cityName: 'Marseille', postalCode: '13001' },
  { countryIso: 'FR', stateCode: 'GUA', stateName: 'Guadeloupe', cityName: 'Basse-Terre', postalCode: '97100' },
  { countryIso: 'FR', stateCode: 'MTQ', stateName: 'Martinique', cityName: 'Fort-de-France', postalCode: '97200' },
  { countryIso: 'FR', stateCode: 'GUF', stateName: 'Guyane', cityName: 'Cayenne', postalCode: '97300' },
  { countryIso: 'FR', stateCode: 'REU', stateName: 'La Réunion', cityName: 'Saint-Denis', postalCode: '97400' },
  { countryIso: 'FR', stateCode: 'MYT', stateName: 'Mayotte', cityName: 'Mamoudzou', postalCode: '97600' },
];

/** UAE — 7 emirates. */
const AE: LocationSeedRow[] = [
  { countryIso: 'AE', stateCode: 'AZ', stateName: 'Abu Dhabi', cityName: 'Abu Dhabi', postalCode: '00000' },
  { countryIso: 'AE', stateCode: 'DU', stateName: 'Dubai', cityName: 'Dubai', postalCode: '00000' },
  { countryIso: 'AE', stateCode: 'SH', stateName: 'Sharjah', cityName: 'Sharjah', postalCode: '00000' },
  { countryIso: 'AE', stateCode: 'AJ', stateName: 'Ajman', cityName: 'Ajman', postalCode: '00000' },
  { countryIso: 'AE', stateCode: 'UQ', stateName: 'Umm Al Quwain', cityName: 'Umm Al Quwain', postalCode: '00000' },
  { countryIso: 'AE', stateCode: 'RK', stateName: 'Ras Al Khaimah', cityName: 'Ras Al Khaimah', postalCode: '00000' },
  { countryIso: 'AE', stateCode: 'FU', stateName: 'Fujairah', cityName: 'Fujairah', postalCode: '00000' },
];

/** United Kingdom — 4 nations + sample cities (postcodes without space). */
const GB: LocationSeedRow[] = [
  { countryIso: 'GB', stateCode: 'ENG', stateName: 'England', cityName: 'London', postalCode: 'SW1A1AA' },
  { countryIso: 'GB', stateCode: 'ENG', stateName: 'England', cityName: 'Manchester', postalCode: 'M11AE' },
  { countryIso: 'GB', stateCode: 'ENG', stateName: 'England', cityName: 'Birmingham', postalCode: 'B11AA' },
  { countryIso: 'GB', stateCode: 'ENG', stateName: 'England', cityName: 'Leeds', postalCode: 'LS11AB' },
  { countryIso: 'GB', stateCode: 'ENG', stateName: 'England', cityName: 'Liverpool', postalCode: 'L11JQ' },
  { countryIso: 'GB', stateCode: 'SCT', stateName: 'Scotland', cityName: 'Edinburgh', postalCode: 'EH11YZ' },
  { countryIso: 'GB', stateCode: 'SCT', stateName: 'Scotland', cityName: 'Glasgow', postalCode: 'G11XQ' },
  { countryIso: 'GB', stateCode: 'WLS', stateName: 'Wales', cityName: 'Cardiff', postalCode: 'CF101EP' },
  { countryIso: 'GB', stateCode: 'WLS', stateName: 'Wales', cityName: 'Swansea', postalCode: 'SA11PQ' },
  { countryIso: 'GB', stateCode: 'NIR', stateName: 'Northern Ireland', cityName: 'Belfast', postalCode: 'BT11AA' },
  { countryIso: 'GB', stateCode: 'NIR', stateName: 'Northern Ireland', cityName: 'Derry', postalCode: 'BT481AA' },
];

export const ALL_LOCATION_SEED_ROWS: LocationSeedRow[] = [...IN, ...IN_EXTRA, ...US, ...FR, ...AE, ...GB];
