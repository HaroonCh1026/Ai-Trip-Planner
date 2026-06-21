AI Trip Planner

AI Trip Planner is a web application that generates personalised, cost-realistic, day-by-day travel itineraries for trips within Pakistan. A user provides a few inputs through a chatbot-style flow, origin, destination, number of days, dates, group size, vehicle preference, and budget, and the system returns a full itinerary with hotels, transport, meals, and entry fees in roughly thirty seconds.

Built as a final year project for the BS Computer Science programme at the Islamia University of Bahawalpur, under the supervision of Sir Fahad Ali.

Why Pakistan-specific

International AI trip planners (Layla, Mindtrip, TripPlanner.ai) and general-purpose tools know city names but not local travel reality: which roads need a 4x4, what a roadside dhaba meal actually costs, or how nine different local vehicle types (Daewoo Express, Faisal Movers, Hiace shared, private sedan, private SUV, flight, etc.) compare in price. AI Trip Planner is built around a dataset and cost model calibrated specifically to Pakistani travel economics, including awareness of jeep-only routes in Northern areas such as Deosai, Fairy Meadows, and Naltar.

How it works


Generate — Google Gemini 2.5 Flash drafts a structured day-by-day itinerary from the user's inputs.
Validate cost — A custom-trained gradient boosting regression model (scikit-learn), trained on a 5,000-row Pakistani travel dataset, predicts a realistic cost range and checks Gemini's output against it.
Validate feasibility — A routing-based checker (Geoapify) flags itineraries that require physically unrealistic travel times between stops.
Present — The result is rendered as an interactive day-by-day itinerary in the browser, with cost breakdowns, hotel and transport detail, and a comparison against DIY booking and traditional tour operator pricing.


From there, the user can save the trip, refine it, or proceed through a simulated booking and payment flow.

Tech stack

LayerTechnologyFrontendReact 18, Vite, React Router 6BackendNode.js, Express, TypeScriptML ServicePython, Flask, scikit-learnDatabaseMongoDB Atlas (Mongoose)PaymentsStripe (test mode)AuthJWT, bcrypt, Google OAuthEmailResendImagesCloudinaryRouting/DistanceGeoapifyBot protection / rate limitingArcjet

Project structure

Project-Code/
├── Backend/        # Express + TypeScript REST API
├── Front-end/       # React 18 + Vite single-page application
└── Ml/              # Python Flask cost-prediction microservice


Backend — 8 controllers, 8 Mongoose models, 8 route modules, 10 services. Handles auth, trip generation orchestration, payments, bookings, and admin operations.
Front-end — 11 page-level routes covering landing, auth, dashboard, trip creation, itinerary view, booking, payments, support, and a 5-page admin panel.
Ml — Flask service exposing a /predict endpoint that returns a predicted trip cost and confidence range in under 300ms, backed by a gradient boosting model (R² 0.9576, MAE ≈ PKR 27,092, RMSE ≈ PKR 43,955).


Key features


Chatbot-style trip input flow with tap-to-select pickers (no typing required)
AI-generated day-by-day itineraries grounded in PKR pricing
ML-validated cost estimates with confidence ranges
Feasibility checking against real road routing data
Trip save, refine, and history
Simulated booking flow with Stripe checkout
Pro subscription tier with Insider Tips panel
PDF export of itineraries
Admin panel for pricing, ML analytics, support tickets, user management, and blog content
Mobile-first, accessible UI (WCAG 2.1 AA, keyboard focus rings, ARIA labelling)


External services

This project integrates with: Google Gemini, Stripe, Geoapify, MongoDB Atlas, Resend, Cloudinary, Google OAuth, and Arcjet. Each of these requires its own API key/credentials, supplied via environment variables (not committed to this repository).

Getting started


Setup commands below are indicative — see each subfolder for exact scripts and required environment variables.



bash# Backend
cd Backend
npm install
npm run dev        # runs on port 5000

# Frontend
cd Front-end
npm install
npm run dev         # runs on port 5173

# ML service
cd Ml
pip install -r requirements.txt
python service.py   # runs on port 5001

Each of the three services needs its own .env file (see .gitignore — these are intentionally excluded from version control). You'll need credentials for MongoDB Atlas, Google Gemini, Stripe, Geoapify, Resend, Cloudinary, Google OAuth, and Arcjet to run the full system end to end.

Methodology

Developed solo over four months using an iterative and incremental lifecycle: seven feature development rounds, three UI polish rounds, and a final documentation phase, for twelve iterations in total.

Author

Haroon Riaz
BS Computer Science, Islamia University of Bahawalpur
