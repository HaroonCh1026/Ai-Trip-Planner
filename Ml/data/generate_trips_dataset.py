#!/usr/bin/env python3
"""
Pakistan Travel Dataset Generator (2026)
Complete version with all destinations and origins.
"""

import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from math import radians, sin, cos, sqrt, atan2

# ----------------------------------------------------------------------
# CONSTANTS
# ----------------------------------------------------------------------
FUEL_PRICE_PER_LITER = 400          # PKR (2026)
EARTH_RADIUS_KM = 6371
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# Vehicle data for road travel (fuel km/l, rent per km)
VEHICLE_DATA = {
    "Car (Small)": {"fuel_kmpl": 14, "rent_per_km": 25},
    "Car (SUV)":   {"fuel_kmpl": 10, "rent_per_km": 40},
    "Hiace":       {"fuel_kmpl":  8, "rent_per_km": 60},
    "Coaster":     {"fuel_kmpl":  5, "rent_per_km": 90},
}

# Flight cost: approximate PKR per km per person (one‑way)
FLIGHT_COST_PER_KM = 12.0

# ----------------------------------------------------------------------
# DESTINATIONS (all regions)
# ----------------------------------------------------------------------
locations = []

# ----- Gilgit-Baltistan (full list) -----
gb = [
    ("Hunza Valley","Gilgit-Baltistan","valley",36.3167,74.6500),
    ("Nagar Valley","Gilgit-Baltistan","valley",36.2500,74.4000),
    ("Shimshal Valley","Gilgit-Baltistan","valley",36.4333,75.3333),
    ("Chipursan Valley","Gilgit-Baltistan","valley",36.8000,74.3667),
    ("Yasin Valley","Gilgit-Baltistan","valley",36.3833,73.3333),
    ("Ishkoman Valley","Gilgit-Baltistan","valley",36.7000,73.7167),
    ("Naltar Valley","Gilgit-Baltistan","valley",36.1500,74.2000),
    ("Hopar Valley","Gilgit-Baltistan","valley",36.2000,74.4500),
    ("Ghizer Valley","Gilgit-Baltistan","valley",36.3167,73.2000),
    ("Tarishing Valley","Gilgit-Baltistan","valley",35.8333,74.8833),
    ("Rupal Valley","Gilgit-Baltistan","valley",35.1667,74.5000),
    ("Chalta Valley","Gilgit-Baltistan","valley",36.5167,74.2000),
    ("Phander Valley","Gilgit-Baltistan","valley",36.2167,72.9500),
    ("Gupis Valley","Gilgit-Baltistan","valley",36.1833,73.4500),
    ("Punial Valley","Gilgit-Baltistan","valley",36.0833,73.5000),
    ("Astore Valley","Gilgit-Baltistan","valley",35.3500,74.8667),
    ("Diamer Valley","Gilgit-Baltistan","valley",35.6167,73.9000),
    ("Skardu","Gilgit-Baltistan","city",35.2971,75.6333),
    ("Gilgit","Gilgit-Baltistan","city",35.9206,74.3145),
    ("Khaplu","Gilgit-Baltistan","city",35.1667,76.3333),
    ("Sost","Gilgit-Baltistan","city",36.7000,74.8000),
    ("Gulmit","Gilgit-Baltistan","city",36.4000,74.8667),
    ("Karimabad","Gilgit-Baltistan","city",36.3167,74.6500),
    ("Aliabad","Gilgit-Baltistan","city",36.3000,74.6167),
    ("Gahkuch","Gilgit-Baltistan","city",36.1667,73.7667),
    ("Dainyor","Gilgit-Baltistan","city",35.9167,74.3667),
    ("Oshikhandass","Gilgit-Baltistan","city",35.9000,74.3500),
    ("Chalt","Gilgit-Baltistan","city",36.2000,74.2833),
    ("Bubind","Gilgit-Baltistan","city",36.2667,74.6667),
    ("Singal","Gilgit-Baltistan","city",36.4833,74.8833),
    ("Haldik","Gilgit-Baltistan","city",36.2333,74.4500),
    ("Barpu","Gilgit-Baltistan","city",36.2167,74.4167),
    ("Minapin","Gilgit-Baltistan","city",36.2167,74.5500),
    ("Gulapur","Gilgit-Baltistan","city",35.3000,75.5000),
    ("Attabad Lake","Gilgit-Baltistan","lake",36.3333,74.8667),
    ("Sheosar Lake","Gilgit-Baltistan","lake",34.9667,75.2500),
    ("Upper Kachura Lake","Gilgit-Baltistan","lake",35.2333,75.6833),
    ("Lower Kachura Lake","Gilgit-Baltistan","lake",35.2167,75.6667),
    ("Satpara Lake","Gilgit-Baltistan","lake",35.2333,75.6167),
    ("Blind Lake","Gilgit-Baltistan","lake",35.2500,75.7000),
    ("Borith Lake","Gilgit-Baltistan","lake",36.4333,74.8667),
    ("Phander Lake","Gilgit-Baltistan","lake",36.2167,72.9500),
    ("Snow Lake (Hispar)","Gilgit-Baltistan","lake",36.4000,75.2000),
    ("Rama Lake","Gilgit-Baltistan","lake",35.0000,74.8000),
    ("Rush Lake","Gilgit-Baltistan","lake",36.2000,74.5000),
    ("Khalti Lake","Gilgit-Baltistan","lake",35.6833,75.0667),
    ("Gindai Gol","Gilgit-Baltistan","lake",36.1500,73.8000),
    ("Shigar Fort","Gilgit-Baltistan","fort",35.4333,75.7333),
    ("Khaplu Fort","Gilgit-Baltistan","fort",35.1667,76.3333),
    ("Bala Hissar (Gilgit)","Gilgit-Baltistan","fort",35.9167,74.3167),
    ("Sher Qilla","Gilgit-Baltistan","fort",36.2167,74.0167),
    ("Kargah Buddha","Gilgit-Baltistan","cultural",35.8833,74.3667),
    ("Danyore Rock Carvings","Gilgit-Baltistan","cultural",35.9000,74.3833),
    ("Khunjerab Pass","Gilgit-Baltistan","adventure",36.8511,75.4289),
    ("Shandur Pass","Gilgit-Baltistan","adventure",36.1000,72.5667),
    ("Darkot Pass","Gilgit-Baltistan","adventure",36.5000,73.9500),
    ("Gondogoro La","Gilgit-Baltistan","adventure",35.6333,76.5000),
    ("Babusar Top","Gilgit-Baltistan","adventure",35.1167,73.9333),
    ("Chilam Chowki","Gilgit-Baltistan","adventure",35.3500,74.8667),
    ("Mashabrum","Gilgit-Baltistan","adventure",35.6333,76.3000),
    ("K-2 Base Camp","Gilgit-Baltistan","adventure",35.8825,76.5133),
    ("Trango Towers","Gilgit-Baltistan","adventure",35.7167,76.2000),
    ("Nanga Parbat Base Camp (Fairy Meadows)","Gilgit-Baltistan","adventure",35.3167,74.5500),
    ("Rakaposhi Base Camp","Gilgit-Baltistan","adventure",36.1422,74.4919),
    ("Passu Cones","Gilgit-Baltistan","adventure",36.4833,74.9000),
    ("Hussaini Suspension Bridge","Gilgit-Baltistan","adventure",36.4833,74.8833),
    ("Batura Glacier","Gilgit-Baltistan","adventure",36.5167,74.5167),
    ("Hispar Glacier","Gilgit-Baltistan","adventure",36.1000,75.2000),
    ("Biafo Glacier","Gilgit-Baltistan","adventure",35.7333,75.7500),
    ("Hoper Glacier","Gilgit-Baltistan","adventure",36.2000,74.5000),
    ("Ghulkin Glacier","Gilgit-Baltistan","adventure",36.4500,74.9000),
    ("Hunza Glacier","Gilgit-Baltistan","adventure",36.3167,74.6500),
    ("Misgar","Gilgit-Baltistan","valley",36.8000,74.2500),
    ("Ghulkin","Gilgit-Baltistan","valley",36.4500,74.9000),
    ("Jalalabad","Gilgit-Baltistan","valley",36.2500,74.4500),
    ("Sultanabad","Gilgit-Baltistan","valley",36.2833,74.5000),
    ("Garelt","Gilgit-Baltistan","valley",36.3167,74.6667),
    ("Murtazabad","Gilgit-Baltistan","valley",36.3167,74.6333),
    ("Salmanabad","Gilgit-Baltistan","valley",36.3167,74.6833),
]
locations.extend(gb)

# ----- Khyber Pakhtunkhwa (full list) -----
kpk = [
    ("Peshawar","KPK","city",34.0150,71.5806),
    ("Abbottabad","KPK","city",34.1500,73.2167),
    ("Mardan","KPK","city",34.2000,72.0500),
    ("Mingora","KPK","city",34.7719,72.3606),
    ("Kohat","KPK","city",33.5833,71.4333),
    ("Dera Ismail Khan","KPK","city",31.8333,70.9000),
    ("Bannu","KPK","city",32.9833,70.6000),
    ("Mansehra","KPK","city",34.3333,73.2000),
    ("Charsadda","KPK","city",34.1500,71.7333),
    ("Swabi","KPK","city",34.1167,72.4667),
    ("Nowshera","KPK","city",34.0167,71.9833),
    ("Haripur","KPK","city",33.9833,72.9333),
    ("Chitral","KPK","city",35.8510,71.7864),
    ("Timargara (Lower Dir)","KPK","city",34.8167,71.8333),
    ("Swat Valley","KPK","valley",35.2225,72.4250),
    ("Malam Jabba","KPK","hill_station",34.7883,72.5600),
    ("Kalam","KPK","valley",35.5000,72.5833),
    ("Mahodand Lake","KPK","lake",35.6000,72.4833),
    ("Ushu Forest","KPK","adventure",35.6000,72.4500),
    ("Madyan","KPK","valley",35.4167,72.5333),
    ("Bahrain","KPK","valley",35.3500,72.5000),
    ("Miandam","KPK","valley",35.0000,72.5167),
    ("Kandol Lake","KPK","lake",35.6167,72.5167),
    ("Spin Khwar","KPK","lake",35.5333,72.4833),
    ("Kuz Bandai","KPK","valley",34.8833,72.4333),
    ("Mankial","KPK","valley",35.5500,72.6000),
    ("Chuprial","KPK","valley",35.4500,72.5333),
    ("Kaghan","KPK","valley",34.7833,73.5167),
    ("Naran","KPK","valley",34.9167,73.6500),
    ("Lake Saif-ul-Malook","KPK","lake",34.8650,73.6900),
    ("Ansoo Lake","KPK","lake",34.8500,73.7500),
    ("Lulusar Lake","KPK","lake",35.0167,73.8333),
    ("Dudipatsar Lake","KPK","lake",35.0167,73.9833),
    ("Pyala Lake","KPK","lake",34.9333,73.7000),
    ("Musk Deer National Park","KPK","adventure",34.9500,73.7500),
    ("Shogran","KPK","hill_station",34.6333,73.4667),
    ("Siri Paye","KPK","lake",34.8300,73.7000),
    ("Nathia Gali","KPK","hill_station",34.0833,73.3833),
    ("Ayubia","KPK","hill_station",34.0667,73.4167),
    ("Thandiani","KPK","hill_station",34.2333,73.3667),
    ("Chappar Gali","KPK","hill_station",34.0833,73.3833),
    ("Biang Gali","KPK","hill_station",34.0500,73.3833),
    ("Ghoragali","KPK","hill_station",34.0833,73.3667),
    ("Baragali","KPK","hill_station",34.0833,73.3833),
    ("Khanaspur","KPK","hill_station",33.9833,73.4000),
    ("Kumrat Valley","KPK","valley",35.7000,72.3833),
    ("Jahaz Banda","KPK","valley",35.6500,72.3000),
    ("Katora Lake","KPK","lake",35.6833,72.3667),
    ("Badgoi Pass","KPK","adventure",35.7167,72.3500),
    ("Kalash Valleys","KPK","valley",35.7000,71.6667),
    ("Bumburet Valley","KPK","valley",35.7000,71.6500),
    ("Rumbur Valley","KPK","valley",35.7000,71.6333),
    ("Birir Valley","KPK","valley",35.5000,71.6833),
    ("Ayun Valley","KPK","valley",35.7167,71.7667),
    ("Mastuj","KPK","valley",36.2833,72.5167),
    ("Booni","KPK","valley",36.2500,72.5000),
    ("Garam Chashma","KPK","adventure",35.9833,71.5000),
    ("Shandur Top","KPK","adventure",36.1000,72.5667),
    ("Omar Gol","KPK","valley",35.9000,71.9000),
    ("Langar","KPK","valley",36.0833,72.4333),
    ("Mulkhow","KPK","valley",36.0167,72.2667),
    ("Upper Dir","KPK","valley",35.2000,71.8667),
    ("Lower Dir","KPK","valley",34.9333,71.7500),
    ("Talash","KPK","valley",34.9167,71.8167),
    ("Laram Top","KPK","adventure",34.8000,71.8500),
    ("Gandogar","KPK","valley",34.8500,71.8000),
    ("Tirah Valley","KPK","valley",33.9000,70.8000),
    ("Kurram Valley","KPK","valley",33.9000,70.1000),
    ("Parachinar","KPK","city",33.9000,70.1000),
    ("Doraha","KPK","adventure",35.3000,73.6000),
    ("Balakot","KPK","city",34.5500,73.3500),
    ("Galyat","KPK","hill_station",34.0833,73.3833),
    ("Dunga Gali","KPK","hill_station",34.0667,73.4167),
    ("Kuz Gali","KPK","hill_station",34.0833,73.3833),
    ("Takht-i-Bahi","KPK","cultural",34.2861,71.9450),
    ("Gandhara","KPK","cultural",34.0000,72.5000),
    ("Peshawar Museum","KPK","cultural",34.0140,71.5710),
    ("Bala Hissar (Peshawar)","KPK","fort",34.0167,71.5667),
    ("Mahabat Khan Mosque","KPK","religious",34.0140,71.5800),
    ("Qissa Khwani Bazaar","KPK","cultural",34.0140,71.5700),
    ("Sethi House","KPK","cultural",34.0140,71.5800),
    ("Gor Khuttree","KPK","cultural",34.0140,71.5700),
    ("Kund","KPK","adventure",33.8667,72.2167),
    ("Wartair Pass","KPK","adventure",34.3500,73.5500),
    ("Mochi Kot","KPK","valley",33.6667,72.0000),
    ("Sara-i-Naurang","KPK","city",33.6000,71.4000),
    ("Lakki Marwat","KPK","city",32.6000,70.9000),
    ("Hangu","KPK","city",33.5333,71.0667),
    ("Karak","KPK","city",33.1167,71.1000),
    ("Tank","KPK","city",32.2167,71.3833),
]
locations.extend(kpk)

# ----- Punjab (full list) -----
punjab = [
    ("Lahore","Punjab","city",31.5497,74.3436),
    ("Rawalpindi","Punjab","city",33.5651,73.0169),
    ("Faisalabad","Punjab","city",31.4180,73.0790),
    ("Multan","Punjab","city",30.1980,71.4687),
    ("Gujranwala","Punjab","city",32.1610,74.1880),
    ("Sialkot","Punjab","city",32.5000,74.5333),
    ("Bahawalpur","Punjab","city",29.3956,71.6836),
    ("Sargodha","Punjab","city",32.0836,72.6711),
    ("Sheikhupura","Punjab","city",31.7131,73.9783),
    ("Jhang","Punjab","city",31.2689,72.3183),
    ("Rahim Yar Khan","Punjab","city",28.4167,70.3000),
    ("Kasur","Punjab","city",31.1167,74.4500),
    ("Okara","Punjab","city",30.8167,73.4500),
    ("Wah Cantonment","Punjab","city",33.7667,72.7500),
    ("Dera Ghazi Khan","Punjab","city",30.0500,70.6333),
    ("Sahiwal","Punjab","city",30.6667,73.1000),
    ("Chiniot","Punjab","city",31.7167,72.9833),
    ("Kamoke","Punjab","city",31.9753,74.2231),
    ("Hafizabad","Punjab","city",32.0694,73.6889),
    ("Mandi Bahauddin","Punjab","city",32.5833,73.5000),
    ("Jhelum","Punjab","city",32.9333,73.7333),
    ("Gujrat","Punjab","city",32.5733,74.0789),
    ("Pakpattan","Punjab","city",30.3500,73.3833),
    ("Vehari","Punjab","city",30.0333,72.3500),
    ("Muzaffargarh","Punjab","city",30.0667,71.1833),
    ("Khanewal","Punjab","city",30.3000,71.9333),
    ("Lodhran","Punjab","city",29.5333,71.6333),
    ("Mianwali","Punjab","city",32.5833,71.5333),
    ("Talagang","Punjab","city",32.9167,72.4167),
    ("Chakwal","Punjab","city",32.9333,72.8517),
    ("Bhakkar","Punjab","city",31.6250,71.0625),
    ("Khushab","Punjab","city",32.2917,72.3500),
    ("Narowal","Punjab","city",32.1000,74.8667),
    ("Shakargarh","Punjab","city",32.2667,75.1667),
    ("Pasrur","Punjab","city",32.2667,74.6667),
    ("Daska","Punjab","city",32.3167,74.3500),
    ("Wazirabad","Punjab","city",32.4333,74.1167),
    ("Alipur Chatha","Punjab","city",32.5167,74.2500),
    ("Chawinda","Punjab","city",32.3500,74.7000),
    ("Sambrial","Punjab","city",32.4667,74.3500),
    ("Jaranwala","Punjab","city",31.3333,73.4167),
    ("Toba Tek Singh","Punjab","city",30.9667,72.4833),
    ("Shorkot","Punjab","city",31.0000,72.5000),
    ("Kot Addu","Punjab","city",30.4700,70.9700),
    ("Mian Channu","Punjab","city",30.4417,72.3542),
    ("Burewala","Punjab","city",30.1667,72.6500),
    ("Arif Wala","Punjab","city",30.2833,73.0667),
    ("Kahror Pakka","Punjab","city",29.6167,71.9167),
    ("Dunyapur","Punjab","city",29.8000,71.7500),
    ("Kabirwala","Punjab","city",30.4000,71.8667),
    ("Mailsi","Punjab","city",29.8000,72.1833),
    ("Khanpur","Punjab","city",28.6500,70.6667),
    ("Yazman","Punjab","city",28.5000,71.5000),
    ("Ahmadpur East","Punjab","city",29.1500,71.2667),
    ("Bahawalnagar","Punjab","city",29.9833,73.2500),
    ("Haroonabad","Punjab","city",29.6167,73.1333),
    ("Fort Abbas","Punjab","city",29.1833,72.8500),
    ("Rajanpur","Punjab","city",29.1000,70.3167),
    ("Rojhan","Punjab","city",28.6833,69.9500),
    ("Layyah","Punjab","city",30.9667,70.9500),
    ("Taunsa","Punjab","city",30.7000,70.6500),
    ("Kot Momin","Punjab","city",32.1833,73.0333),
    ("Bhera","Punjab","city",32.4833,72.9000),
    ("Malakwal","Punjab","city",32.5500,73.2000),
    ("Phalia","Punjab","city",32.4333,73.5833),
    ("Dinga","Punjab","city",32.6333,73.7333),
    ("Pind Dadan Khan","Punjab","city",32.6000,73.0500),
    ("Kallar Kahar","Punjab","city",32.7833,72.7000),
    ("Nankana Sahib","Punjab","city",31.4500,73.7000),
    ("Moro","Punjab","city",26.6667,67.9833),
    ("Hasilpur","Punjab","city",29.6833,72.5500),
    ("Chishtian","Punjab","city",29.8000,72.8667),
    ("Vihari","Punjab","city",30.0333,72.3333),
    ("Gaggo Mandi","Punjab","city",30.2333,72.5500),
    ("Minchanabad","Punjab","city",30.1667,73.1333),
    ("Renala Khurd","Punjab","city",30.8833,73.6000),
    ("Pattoki","Punjab","city",31.0167,73.8333),
    ("Chunian","Punjab","city",31.4167,73.9000),
    ("Raiwind","Punjab","city",31.2500,74.2167),
    ("Kot Radha Kishan","Punjab","city",31.1667,74.1000),
    ("Muridke","Punjab","city",31.8000,74.2500),
    ("Sharaqpur","Punjab","city",31.4667,74.1000),
    ("Sangla Hill","Punjab","city",31.7167,73.3833),
    ("Pindi Bhattian","Punjab","city",31.9000,73.2833),
    ("Lalian","Punjab","city",32.0833,72.8000),
    ("Chowk Azam","Punjab","city",30.6333,72.2000),
    ("Karor Lal Esan","Punjab","city",30.7000,71.1000),
    ("Jatoi","Punjab","city",29.5167,71.2167),
    ("Alipur","Punjab","city",29.3833,70.9167),
    ("Dera Din Panah","Punjab","city",30.5667,70.8000),
    ("Basti Malik","Punjab","city",29.1167,70.3667),
    ("Kot Sultan","Punjab","city",30.9500,71.2333),
    ("Leiah","Punjab","city",30.9667,70.9500),
    ("Chobara","Punjab","city",31.4000,70.5000),
    ("Kot Adu","Punjab","city",30.4500,70.9667),
    ("Qadirpur Ran","Punjab","city",30.2833,71.5167),
    ("Khan Bela","Punjab","city",29.6667,71.1167),
    ("Rohillanwali","Punjab","city",30.3000,71.6000),
    ("Jalalpur","Punjab","city",32.6167,73.2333),
    ("Kundian","Punjab","city",32.4500,71.4833),
    ("Makhdumpur","Punjab","city",31.1333,73.5167),
    ("Kahna Nau","Punjab","city",31.4167,74.3667),
    ("Nazir Town","Punjab","city",33.8833,72.7000),
    ("Bhalwal","Punjab","city",32.2667,72.9000),
    ("Sillanwali","Punjab","city",32.0000,72.5333),
    ("Jhawarian","Punjab","city",32.3500,72.6167),
    ("Qaidabad","Punjab","city",31.8333,72.6667),
    ("Pir Mahal","Punjab","city",30.7667,72.4333),
    ("Rasool Nagar","Punjab","city",30.8333,73.0667),
    ("Mamu Kanjan","Punjab","city",30.8333,72.8000),
    ("Hujra Shah Muqeem","Punjab","city",30.7500,73.8167),
    ("Depalpur","Punjab","city",30.7000,73.6500),
    ("Basirpur","Punjab","city",30.6000,73.8333),
    ("Chichawatni","Punjab","city",30.5333,72.7000),
    ("Jahanian","Punjab","city",30.5000,72.2333),
    ("Kakepota","Punjab","city",31.4667,74.2333),
]
locations.extend(punjab)

# ----- Sindh (full list) -----
sindh = [
    ("Port Grand","Sindh","tourism",24.8466,66.9987),
    ("Do Darya","Sindh","tourism",24.8020,66.9760),
    ("Empress Market","Sindh","market",24.8615,67.0310),
    ("Frere Hall","Sindh","historical",24.8465,67.0317),
    ("Mohatta Palace","Sindh","museum",24.8136,67.0337),
    ("Quaid-e-Azam Mausoleum","Sindh","historical",24.8752,67.0396),
    ("Pakistan Maritime Museum","Sindh","museum",24.9342,67.1056),
    ("Karachi Zoo","Sindh","park",24.8731,67.0365),
    ("Safari Park Karachi","Sindh","park",24.9385,67.0943),
    ("Hill Park Karachi","Sindh","park",24.8825,67.0900),
    ("Turtle Beach","Sindh","coastal",24.8500,66.7167),
    ("Paradise Point","Sindh","coastal",24.8167,66.7000),
    ("Cape Monze","Sindh","coastal",24.8167,66.6667),
    ("Sonmiani Beach","Sindh","coastal",25.0333,66.5667),
    ("Manchar Lake","Sindh","lake",26.4167,67.8833),
    ("Dhandh Wildlife Sanctuary","Sindh","nature",24.8000,67.8000),
    ("Kot Diji Fort","Sindh","fort",27.3410,68.7100),
    ("Faiz Mahal Khairpur","Sindh","historical",27.5290,68.7600),
    ("Shrine of Shah Abdul Latif Bhittai","Sindh","religious",25.8000,68.4833),
    ("Lal Shahbaz Qalandar Shrine","Sindh","religious",26.4167,67.8667),
    ("Karoonjhar Mountains","Sindh","adventure",24.3500,70.7500),
    ("Bhodesar Temples","Sindh","historical",24.3500,70.7500),
    ("Virawah","Sindh","historical",24.3000,70.7000),
    ("Lansdowne Bridge Sukkur","Sindh","historical",27.7050,68.8575),
    ("Sadh Belo Temple","Sindh","religious",27.7050,68.8575),
    ("Bukkur Island","Sindh","historical",27.7050,68.8575),
    ("Rani Bagh Hyderabad","Sindh","park",25.3789,68.3689),
    ("Pakka Qila Hyderabad","Sindh","fort",25.3789,68.3689),
    ("Keti Bandar","Sindh","coastal",24.1333,67.4500),
    ("Shah Jahan Mosque Thatta","Sindh","historical",24.7500,67.8333),
]
locations.extend(sindh)

# ----- Balochistan (full list) -----
balochistan = [
    ("Hazarganji Chiltan National Park","Balochistan","adventure",30.1500,66.8500),
    ("Urak Valley","Balochistan","hill_station",30.3000,67.0500),
    ("Spin Karez","Balochistan","hill_station",30.4000,67.1000),
    ("Juniper Forest Ziarat","Balochistan","nature",30.3833,67.7333),
    ("Prospect Point Ziarat","Balochistan","viewpoint",30.3833,67.7500),
    ("Gwadar Beach","Balochistan","beach",25.1264,62.3225),
    ("Hammerhead Gwadar","Balochistan","viewpoint",25.1400,62.3200),
    ("Gwadar Marine Drive","Balochistan","coastal",25.1300,62.3300),
    ("Sunset Park Gwadar","Balochistan","viewpoint",25.1350,62.3250),
    ("Hingol River","Balochistan","nature",26.4000,64.4000),
    ("Mud Volcano Hingol","Balochistan","adventure",25.5000,65.5000),
    ("Chandragup Mud Volcano","Balochistan","adventure",25.5000,65.5000),
    ("Nani Mandir Hinglaj","Balochistan","religious",25.5167,65.5167),
    ("Golden Beach Gwadar","Balochistan","beach",25.2000,62.3500),
    ("Ormara Viewpoint","Balochistan","viewpoint",25.2000,64.6667),
    ("Pasni Fish Harbor","Balochistan","coastal",25.2667,63.4667),
    ("Jiwani Beach","Balochistan","beach",25.0500,61.7500),
    ("Moola Chotok","Balochistan","waterfall",27.8000,66.3000),
    ("Pir Ghaib Waterfall","Balochistan","waterfall",29.1000,67.7000),
    ("Bolan Pass","Balochistan","adventure",29.6000,67.3000),
    ("Quaid e Azam Residency Ziarat","Balochistan","historical",30.3833,67.7333),
    ("Mehrgarh","Balochistan","historical",29.4000,67.8500),
    ("Kharan Desert","Balochistan","desert",28.5833,65.4167),
    ("Chagai Hills","Balochistan","desert",28.9833,64.6000),
    ("East Bay Gwadar","Balochistan","coastal",25.1400,62.3500),
    ("West Bay Gwadar","Balochistan","coastal",25.1200,62.3000),
]
locations.extend(balochistan)

# ----- AJK (full list) -----
ajk = [
    ("Muzaffarabad","AJK","city",34.3667,73.4667),
    ("Neelum Valley","AJK","valley",34.6167,73.9000),
    ("Arang Kel","AJK","valley",34.8000,73.9667),
    ("Kel","AJK","valley",34.8000,74.1000),
    ("Sharda","AJK","valley",34.8000,74.2500),
    ("Ganga Lake (Chitta Katha)","AJK","lake",34.8167,74.1667),
    ("Kutton (Jagged)","AJK","adventure",34.5333,73.5333),
    ("Rawalakot","AJK","city",33.8500,73.7500),
    ("Banjosa Lake","AJK","lake",33.8667,73.8167),
    ("Nambal Lake","AJK","lake",33.8667,73.7833),
    ("Toli Pir","AJK","hill_station",33.8000,73.8000),
    ("Pir Chinasi","AJK","hill_station",34.3833,73.5500),
    ("Leepa Valley","AJK","valley",34.2667,73.6667),
    ("Hattian Bala","AJK","city",34.1667,73.7500),
    ("Chikkar","AJK","valley",34.1667,73.8167),
    ("Bagh","AJK","city",33.9833,73.7833),
    ("Kotli","AJK","city",33.5167,73.9000),
    ("Mirpur","AJK","city",33.1500,73.7500),
    ("Mangla Dam","AJK","lake",33.1500,73.6500),
    ("Ratti Gali Lake","AJK","lake",34.8167,74.0667),
    ("Saral Lake","AJK","lake",34.8667,74.1000),
    ("Tatta Pani","AJK","adventure",34.3500,73.7000),
    ("Dheerkot","AJK","valley",33.9167,73.7833),
    ("Sudhan Gali","AJK","hill_station",33.8167,73.7667),
    ("Banjon","AJK","valley",33.8500,73.8333),
]
locations.extend(ajk)

# Remove duplicate destination names (keep first occurrence)
unique_locs = {}
for loc in locations:
    name = loc[0]
    if name not in unique_locs:
        unique_locs[name] = loc
final_locs = list(unique_locs.values())
print(f"Total unique destinations: {len(final_locs)}")
dest_df = pd.DataFrame(final_locs, columns=["destination","region","type","lat","lon"])

# ----------------------------------------------------------------------
# ORIGINS (starting cities) – full list
# ----------------------------------------------------------------------
origins = [
    # Punjab
    ("Lahore",31.5497,74.3436),("Rawalpindi",33.5651,73.0169),("Faisalabad",31.4180,73.0790),
    ("Multan",30.1980,71.4687),("Gujranwala",32.1610,74.1880),("Sialkot",32.5000,74.5333),
    ("Bahawalpur",29.3956,71.6836),("Sargodha",32.0836,72.6711),("Sheikhupura",31.7131,73.9783),
    ("Jhang",31.2689,72.3183),("Rahim Yar Khan",28.4167,70.3000),("Kasur",31.1167,74.4500),
    ("Okara",30.8167,73.4500),("Wah Cantonment",33.7667,72.7500),("Dera Ghazi Khan",30.0500,70.6333),
    ("Sahiwal",30.6667,73.1000),("Chiniot",31.7167,72.9833),("Kamoke",31.9753,74.2231),
    ("Hafizabad",32.0694,73.6889),("Mandi Bahauddin",32.5833,73.5000),("Jhelum",32.9333,73.7333),
    ("Gujrat",32.5733,74.0789),("Pakpattan",30.3500,73.3833),("Vehari",30.0333,72.3500),
    ("Muzaffargarh",30.0667,71.1833),("Khanewal",30.3000,71.9333),("Lodhran",29.5333,71.6333),
    ("Mianwali",32.5833,71.5333),("Talagang",32.9167,72.4167),("Chakwal",32.9333,72.8517),
    ("Bhakkar",31.6250,71.0625),("Khushab",32.2917,72.3500),("Narowal",32.1000,74.8667),
    ("Shakargarh",32.2667,75.1667),("Pasrur",32.2667,74.6667),("Daska",32.3167,74.3500),
    ("Wazirabad",32.4333,74.1167),("Alipur Chatha",32.5167,74.2500),("Chawinda",32.3500,74.7000),
    ("Sambrial",32.4667,74.3500),("Jaranwala",31.3333,73.4167),("Toba Tek Singh",30.9667,72.4833),
    ("Shorkot",31.0000,72.5000),("Kot Addu",30.4700,70.9700),("Mian Channu",30.4417,72.3542),
    ("Burewala",30.1667,72.6500),("Arif Wala",30.2833,73.0667),("Kahror Pakka",29.6167,71.9167),
    ("Dunyapur",29.8000,71.7500),("Kabirwala",30.4000,71.8667),("Mailsi",29.8000,72.1833),
    ("Khanpur",28.6500,70.6667),("Yazman",28.5000,71.5000),("Ahmadpur East",29.1500,71.2667),
    ("Bahawalnagar",29.9833,73.2500),("Haroonabad",29.6167,73.1333),("Fort Abbas",29.1833,72.8500),
    ("Rajanpur",29.1000,70.3167),("Rojhan",28.6833,69.9500),("Layyah",30.9667,70.9500),
    ("Taunsa",30.7000,70.6500),("Kot Momin",32.1833,73.0333),("Bhera",32.4833,72.9000),
    ("Malakwal",32.5500,73.2000),("Phalia",32.4333,73.5833),("Dinga",32.6333,73.7333),
    ("Pind Dadan Khan",32.6000,73.0500),("Kallar Kahar",32.7833,72.7000),("Nankana Sahib",31.4500,73.7000),
    ("Hasilpur",29.6833,72.5500),("Chishtian",29.8000,72.8667),("Vihari",30.0333,72.3333),
    ("Gaggo Mandi",30.2333,72.5500),("Minchanabad",30.1667,73.1333),("Renala Khurd",30.8833,73.6000),
    ("Pattoki",31.0167,73.8333),("Chunian",31.4167,73.9000),("Raiwind",31.2500,74.2167),
    ("Kot Radha Kishan",31.1667,74.1000),("Muridke",31.8000,74.2500),("Sharaqpur",31.4667,74.1000),
    ("Sangla Hill",31.7167,73.3833),("Pindi Bhattian",31.9000,73.2833),("Lalian",32.0833,72.8000),
    ("Chowk Azam",30.6333,72.2000),("Karor Lal Esan",30.7000,71.1000),("Jatoi",29.5167,71.2167),
    ("Alipur",29.3833,70.9167),("Dera Din Panah",30.5667,70.8000),("Basti Malik",29.1167,70.3667),
    ("Kot Sultan",30.9500,71.2333),("Leiah",30.9667,70.9500),("Chobara",31.4000,70.5000),
    ("Kot Adu",30.4500,70.9667),("Qadirpur Ran",30.2833,71.5167),("Khan Bela",29.6667,71.1167),
    ("Rohillanwali",30.3000,71.6000),("Jalalpur",32.6167,73.2333),("Kundian",32.4500,71.4833),
    ("Makhdumpur",31.1333,73.5167),("Kahna Nau",31.4167,74.3667),("Nazir Town",33.8833,72.7000),
    ("Bhalwal",32.2667,72.9000),("Sillanwali",32.0000,72.5333),("Jhawarian",32.3500,72.6167),
    ("Qaidabad",31.8333,72.6667),("Pir Mahal",30.7667,72.4333),("Rasool Nagar",30.8333,73.0667),
    ("Mamu Kanjan",30.8333,72.8000),("Hujra Shah Muqeem",30.7500,73.8167),("Depalpur",30.7000,73.6500),
    ("Basirpur",30.6000,73.8333),("Chichawatni",30.5333,72.7000),("Jahanian",30.5000,72.2333),
    ("Kakepota",31.4667,74.2333),
    # Sindh
    ("Karachi",24.8607,67.0011),("Hyderabad",25.3789,68.3689),("Sukkur",27.7050,68.8575),
    ("Larkana",27.5500,68.2167),("Nawabshah",26.2500,68.4167),("Mirpur Khas",25.5333,69.0000),
    ("Khairpur",27.5333,68.7667),("Dadu",26.7333,67.7833),("Jacobabad",28.2833,68.4333),
    ("Shikarpur",27.9500,68.6333),("Tando Allahyar",25.4667,68.7167),("Tando Muhammad Khan",25.1167,68.5333),
    ("Badin",24.6500,68.8333),("Thatta",24.7500,67.8333),("Ghotki",28.0167,69.3167),
    ("Rohri",27.6833,68.9000),("Kandhkot",28.2333,69.1833),("Kashmore",28.2500,69.5833),
    ("Matiari",25.6000,68.4500),("Jamshoro",25.4333,68.2833),("Sehwan Sharif",26.4167,67.8667),
    ("Mehar",27.1833,67.8167),("Moro",26.6667,67.9833),("Naushahro Feroze",26.8333,68.1167),
    ("Bhirya Road",26.5167,68.0333),("Qambar",27.5833,68.7667),("Shahdadkot",27.8500,67.9000),
    ("Ratodero",27.8000,68.3000),("Ubauro",28.1667,69.7333),("Pano Aqil",27.8500,69.1167),
    ("Mirpur Mathelo",28.0167,69.5500),("Khipro",25.8167,69.3667),("Digri",25.6667,69.1167),
    ("Chhor",25.5167,69.7833),("Islamkot",24.7000,70.1833),("Mithi",24.7333,69.8000),
    ("Diplo",24.4667,69.9500),("Umerkot",25.3667,69.7333),("Kunri",25.1833,69.5667),
    ("Sanghar",26.0500,68.9500),("Shahdadpur",25.9167,68.6167),("Sinjhoro",26.0333,68.8000),
    ("Tando Adam",25.7667,68.6667),("Jati",24.3500,68.2667),("Sajawal",24.6000,67.7500),
    ("Keti Bunder",24.1333,67.3333),("Chuhar Jamali",24.3833,67.9500),("Gharo",24.7333,67.5833),
    ("Bin Qasim",24.8333,67.0667),("Korangi",24.8333,67.1500),("Landhi",24.8500,67.2500),
    ("Malir",24.9000,67.2000),("Gulshan-e-Maymar",24.9000,67.3000),("New Karachi",24.9500,67.0500),
    ("North Nazimabad",24.9333,67.0500),("Lyari",24.8667,66.9833),("Orangi",24.9500,67.0000),
    ("Kotri",25.3667,68.3000),("Hala",25.8167,68.4167),("Bhit Shah",25.8000,68.4833),
    ("Sakrand",26.1333,68.2667),("Daulatpur",26.5000,68.0000),("Daur",26.4167,68.3167),
    ("Kazi Ahmed",26.5833,68.4500),("Bozdar",26.9000,68.8167),("Shahpur Chakar",26.3167,67.8167),
    ("Jhol",26.3167,68.2167),("Thari Mirwah",25.4333,69.1500),("Naukot",24.8667,69.4000),
    ("Samaro",25.2833,69.4167),("Pithoro",25.5167,69.3833),("Tando Jan Mohammad",25.7000,68.5333),
    ("Tando Qaiser",25.7000,68.6667),("Talhar",24.8667,68.8333),("Matli",24.9333,68.6500),
    ("Sujawal",24.6000,68.0833),("Bhan",25.3000,67.8500),("Gulistan-e-Johar",24.9167,67.1167),
    ("Gadap",25.0333,67.1500),("Surjani",24.9833,67.0667),
    # KPK
    ("Peshawar",34.0150,71.5806),("Abbottabad",34.1500,73.2167),("Mardan",34.2000,72.0500),
    ("Mingora",34.7719,72.3606),("Kohat",33.5833,71.4333),("Dera Ismail Khan",31.8333,70.9000),
    ("Charsadda",34.1500,71.7333),("Mansehra",34.3333,73.2000),("Bannu",32.9833,70.6000),
    ("Nowshera",34.0167,71.9833),("Swabi",34.1167,72.4667),("Haripur",33.9833,72.9333),
    ("Chitral",35.8510,71.7864),("Tank",32.2167,71.3833),("Lakki Marwat",32.6167,70.9000),
    ("Batkhela",34.6167,71.9667),("Timargara",34.8167,71.8333),("Hangu",33.5333,71.0667),
    ("Karak",33.1167,71.1000),("Buner",34.4000,72.5000),("Shangla",34.9000,72.7000),
    ("Upper Dir",35.2000,71.8667),("Lower Dir",34.9333,71.7500),("Malakand",34.6000,71.9000),
    ("Mohan",33.7333,71.6000),("Risalpur",34.0833,71.9833),("Jehangira",34.0333,72.0667),
    ("Akora Khattak",34.0000,72.1167),("Pabbi",34.0000,72.0167),("Takht-i-Bahi",34.2861,71.9450),
    ("Shabqadar",34.2167,71.5500),("Tangi",34.3000,71.6500),("Dargai",34.5000,71.8833),
    ("Matta",34.9333,72.3500),("Barikot",34.6667,72.2167),("Kabal",34.8000,72.3000),
    ("Kalam",35.5000,72.5833),("Bahrain",35.3500,72.5000),("Madyan",35.4167,72.5333),
    ("Khwazakhela",34.8833,72.4333),("Alpuri",34.9000,72.6500),("Besham",34.9167,72.8667),
    ("Pattan",34.9833,73.0167),("Thall",33.4167,70.7500),("Parachinar",33.9000,70.1000),
    ("Kurram",33.8000,70.0000),("Miran Shah",33.0000,70.0667),("Wana",32.3000,69.5667),
    ("Ladha",32.5500,69.7500),("Mamund",34.6000,71.3500),("Bajaur",34.7500,71.5000),
    ("Mohmand",34.3500,71.3667),("Ghalanai",34.0833,71.4167),("Khar",34.7500,71.5000),
    ("Darosh",35.4667,71.8000),("Bono",35.6833,71.8000),("Gol Basti",34.4167,73.0000),
    ("Karimabad",36.3167,74.6500),
    # Balochistan
    ("Quetta",30.1798,66.9750),("Turbat",26.0000,63.0833),("Gwadar",25.1333,62.3167),
    ("Khuzdar",27.8000,66.6000),("Sibi",29.5500,67.8833),("Loralai",30.3667,68.6000),
    ("Zhob",31.3333,69.4667),("Chaman",30.9167,66.4500),("Dera Bugti",29.0333,69.1667),
    ("Kohlu",29.8833,69.2500),("Ziarat",30.3833,67.7333),("Mastung",29.8000,66.8333),
    ("Kalat",29.0333,66.5833),("Nushki",29.5500,66.0000),("Dalbandin",28.8833,64.4167),
    ("Kharan",28.5833,65.4167),("Panjgur",26.9667,64.0833),("Awaran",26.4500,65.2333),
    ("Barkhan",29.9000,69.5167),("Musakhel",30.8500,69.8000),("Chagai",27.9833,64.9167),
    ("Washuk",28.5000,67.1167),("Lasbela",25.8667,66.6167),("Hub",25.1167,66.9000),
    ("Bela",26.2333,66.3000),("Pasni",25.2667,63.4667),("Jiwani",25.0500,61.7500),
    ("Ormara",25.2000,64.6667),("Kund Malir",25.1500,65.6500),("Taftan",29.2333,61.9167),
    ("Nok Kundi",28.8333,64.1667),("Qilla Abdullah",30.7500,66.6500),("Pishin",30.5667,66.9667),
    ("Killa Saifullah",30.7000,68.3667),("Harnai",30.1000,67.9333),("Mekhtar",29.8167,67.1000),
    ("Duki",30.1500,68.5667),("Shahrig",29.6000,67.7000),("Sohbatpur",28.2500,68.2500),
    ("Jafarabad",28.3500,68.4500),("Usta Muhammad",28.3000,68.2500),("Dhadar",29.4833,67.6667),
    ("Bhag",29.8333,67.8167),("Mithri",28.9667,65.9167),("Gulistan",31.2500,66.6333),
    ("Toba",30.3667,66.6500),("Kishni",29.9167,68.0000),("Garhi Khairo",28.1667,68.3833),
    # Gilgit-Baltistan
    ("Gilgit",35.9206,74.3145),("Skardu",35.2971,75.6333),("Hunza",36.3167,74.6500),
    ("Nagar",36.2500,74.4000),("Ghanche",35.1667,76.3333),("Shigar",35.4333,75.7333),
    ("Astore",35.3500,74.8667),("Chilas",35.4167,74.1000),("Diamer",35.6167,73.9000),
    ("Ghizer",36.3167,73.2000),("Yasin",36.3833,73.3333),("Ishkoman",36.7000,73.7167),
    ("Phander",36.2167,72.9500),("Gupis",36.1833,73.4500),("Punial",36.0833,73.5000),
    ("Sher Qilla",36.2167,74.0167),("Khapalu",35.1667,76.3333),("Roundu",35.4167,75.4500),
    ("Hoper",36.2000,74.5000),("Passu",36.4833,74.8833),
    # AJK
    ("Muzaffarabad",34.3667,73.4667),("Mirpur",33.1500,73.7500),("Rawalakot",33.8500,73.7500),
    ("Bagh",33.9833,73.7833),("Kotli",33.5167,73.9000),("Palandri",33.7167,73.6833),
    ("Bhimber",32.9833,74.1000),("Hattian Bala",34.1667,73.7500),("Athmuqam",34.5667,73.8833),
    ("Kel",34.8000,74.1000),("Sharda",34.8000,74.2500),("Arang Kel",34.8000,73.9667),
    ("Tatta Pani",34.3500,73.7000),("Chikkar",34.1667,73.8167),("Dheerkot",33.9167,73.7833),
    ("Banjosa",33.8667,73.8167),("Sudhan Gali",33.8167,73.7667),("Toli Pir",33.8000,73.8000),
    ("Pir Chinasi",34.3833,73.5500),("Leepa Valley",34.2667,73.6667),
    # ICT
    ("Islamabad",33.6844,73.0479),
]

print(f"Total origin cities: {len(origins)}")

# ----------------------------------------------------------------------
# COST PROFILES (per night per room / per person per day)
# Format: (accom_low, accom_high, food_low, food_high, act_low, act_high)
# Accommodation is per room per night; food & activities per person per day.
# Rooms = ceil(group_size / 2)
# ----------------------------------------------------------------------
cost_profiles = {
    "Budget": {
        "Northern": (3000, 5500, 800, 1500, 400, 900),
        "City":     (2000, 4000, 600, 1200, 300, 700),
        "Coastal":  (3500, 6500, 900, 1800, 500, 1000)
    },
    "Mid": {
        "Northern": (8000, 15000, 1500, 2800, 800, 1800),
        "City":     (6000, 12000, 1200, 2200, 600, 1400),
        "Coastal":  (7000, 14000, 1400, 2600, 800, 1800)
    },
    "Luxury": {
        "Northern": (22000, 40000, 2800, 5000, 1500, 3500),
        "City":     (15000, 30000, 2200, 4000, 1200, 2800),
        "Coastal":  (18000, 35000, 2500, 4500, 1400, 3200)
    }
}

trip_classes = ["Budget", "Mid", "Luxury"]
trip_weights = [0.30, 0.50, 0.20]

nationalities = ["Pakistani"] * 85 + ["Foreign"] * 15
genders = ["Male"] * 60 + ["Female"] * 40
trip_types = ["Leisure", "Adventure", "Business", "Family"]

# ----------------------------------------------------------------------
# HELPER FUNCTIONS
# ----------------------------------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    """Great-circle distance in km."""
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    dphi = radians(lat2 - lat1)
    dlam = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlam/2)**2
    return EARTH_RADIUS_KM * 2 * atan2(sqrt(a), sqrt(1-a))

def road_distance(origin_name, olat, olon, dest_name, dlat, dlon):
    """Return road distance in km (Haversine * road factor)."""
    if origin_name == dest_name:
        return random.randint(10, 50)
    dist = haversine(olat, olon, dlat, dlon)
    # Road factor: 1.0 to 1.4 (mountains have longer roads)
    factor = random.uniform(1.0, 1.4)
    return int(dist * factor)

def region_type(region):
    if region in ["Gilgit-Baltistan", "KPK", "AJK"]:
        return "Northern"
    elif region in ["Sindh", "Balochistan"]:
        return "Coastal"
    return "City"

def random_date():
    start = datetime(2025, 1, 1)
    end = datetime(2026, 12, 31)
    return start + timedelta(days=random.randint(0, (end-start).days))

def transport_cost(distance, group_size, region, trip_class):
    """
    Decide Road or Flight and compute cost.
    Road: uses a random vehicle from VEHICLE_DATA, fuel + rent.
    Flight: uses FLIGHT_COST_PER_KM * distance * group_size.
    """
    # Probability of flight increases with distance and trip class
    flight_prob = min(0.7, max(0.1, distance / 1200.0))
    if trip_class == "Luxury":
        flight_prob *= 1.2
    if region in ["Gilgit-Baltistan", "KPK", "AJK"] and distance > 500:
        flight_prob += 0.2
    use_flight = random.random() < flight_prob

    if use_flight:
        # Flight cost: per km per person
        cost = FLIGHT_COST_PER_KM * distance * group_size
        # Add some random noise
        cost *= random.uniform(0.9, 1.2)
        return "Flight", int(cost)
    else:
        # Road: choose a vehicle
        vehicle = random.choice(list(VEHICLE_DATA.keys()))
        v = VEHICLE_DATA[vehicle]
        # Fuel cost
        fuel_liters = distance / v["fuel_kmpl"]
        fuel_cost = fuel_liters * FUEL_PRICE_PER_LITER
        # Rent cost
        rent_cost = distance * v["rent_per_km"]
        # Group discount (share vehicle)
        if group_size > 1:
            discount = 0.90 if group_size <= 3 else 0.80
            rent_cost *= discount
        total = fuel_cost + rent_cost
        # Add tolls (~0.5 PKR/km)
        tolls = distance * 0.5 * random.uniform(0.8, 1.2)
        total += tolls
        # Random noise
        total *= random.uniform(0.9, 1.1)
        return f"Road ({vehicle})", int(total)

# ----------------------------------------------------------------------
# MAIN GENERATOR
# ----------------------------------------------------------------------
def generate_trip(trip_id):
    # Pick random destination and origin
    dest_row = dest_df.sample(1).iloc[0]
    d_name = dest_row["destination"]
    d_region = dest_row["region"]
    d_lat = dest_row["lat"]
    d_lon = dest_row["lon"]

    origin = random.choice(origins)
    o_name, o_lat, o_lon = origin

    # Compute distance
    distance = road_distance(o_name, o_lat, o_lon, d_name, d_lat, d_lon)

    # Duration: longer for Northern areas
    if d_region in ["Gilgit-Baltistan", "KPK", "AJK"]:
        duration = random.choice([5, 6, 7, 8, 9, 10])
    else:
        duration = random.choice([2, 3, 4, 5])

    # Date and season
    start = random_date()
    end = start + timedelta(days=duration)
    month = start.month
    if month in [12, 1, 2]:
        season = "Winter"
    elif month in [3, 4, 5]:
        season = "Spring"
    elif month in [6, 7, 8]:
        season = "Summer"
    else:
        season = "Autumn"

    # Demographics
    age = random.randint(18, 65)
    gender = random.choice(genders)
    nationality = random.choice(nationalities)
    group_size = random.randint(1, 6)   # max 6
    trip_type = random.choice(trip_types)

    # Trip class
    trip_class = random.choices(trip_classes, weights=trip_weights)[0]

    # Costs
    rtype = region_type(d_region)
    accom_low, accom_high, food_low, food_high, act_low, act_high = cost_profiles[trip_class][rtype]

    # Accommodation: per room per night, assume 1 room per 2 people
    rooms = (group_size + 1) // 2
    accommodation = random.randint(accom_low, accom_high) * rooms * duration

    # Food: per person per day
    food = random.randint(food_low, food_high) * group_size * duration

    # Activities: per person per day
    activities = random.randint(act_low, act_high) * group_size * duration

    # Transport (Road or Flight)
    transport_type, transport = transport_cost(distance, group_size, d_region, trip_class)

    # Total cost
    total = accommodation + food + activities + transport

    # Apply a seasonal multiplier (peak summer for north, winter for south)
    if d_region in ["Gilgit-Baltistan", "KPK", "AJK"] and month in [6, 7, 8]:
        total = int(total * random.uniform(1.1, 1.3))
    elif d_region in ["Sindh", "Balochistan"] and month in [12, 1, 2]:
        total = int(total * random.uniform(1.05, 1.2))

    # Add foreigner premium (approx 10-20% higher)
    if nationality == "Foreign":
        premium = random.uniform(1.1, 1.2)
        accommodation = int(accommodation * premium)
        food = int(food * premium)
        activities = int(activities * premium)
        transport = int(transport * premium)
        total = int(total * premium)

    return {
        "Trip ID": trip_id,
        "Origin city": o_name,
        "Destination": d_name,
        "Region": d_region,
        "Distance (km)": distance,
        "Start date": start.strftime("%Y-%m-%d"),
        "End date": end.strftime("%Y-%m-%d"),
        "Duration (days)": duration,
        "Traveler age": age,
        "Traveler gender": gender,
        "Traveler nationality": nationality,
        "Group size": group_size,
        "Trip type": trip_type,
        "Accommodation type": trip_class,
        "Accommodation cost": accommodation,
        "Transportation type": transport_type,
        "Transportation cost": transport,
        "Food cost": food,
        "Activities cost": activities,
        "Total cost": total,
        "Season": season,
        "Currency": "PKR"
    }

# ----------------------------------------------------------------------
# GENERATE DATASET
# ----------------------------------------------------------------------
num_trips = 5000   # change to 10000 for more data
print(f"Generating {num_trips} trips...")
trips = []
for i in range(num_trips):
    trips.append(generate_trip(i + 1))
    if (i + 1) % 1000 == 0:
        print(f"  ... generated {i + 1} trips")

df = pd.DataFrame(trips)

# Validate: Total cost should approximately equal sum of components
df["Check"] = df["Accommodation cost"] + df["Food cost"] + df["Activities cost"] + df["Transportation cost"] - df["Total cost"]
mismatches = (df["Check"].abs() > 100).sum()
if mismatches > 0:
    print(f"Warning: {mismatches} rows have cost mismatch >100 PKR. Fixing by setting Total cost to sum.")
    df["Total cost"] = df["Accommodation cost"] + df["Food cost"] + df["Activities cost"] + df["Transportation cost"]

# Drop the temporary Check column
df.drop(columns=["Check"], inplace=True)

# Save CSV
output_file = "pakistan_travel_dataset.csv"
df.to_csv(output_file, index=False)
print(f"\n✅ Dataset saved to '{output_file}'")
print(f"   Total rows: {len(df)}")
print(f"   Columns: {list(df.columns)}")
print(f"   Sample destination counts:\n{df['Destination'].value_counts().head(10)}")