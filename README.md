#Cloning and accessing locally instructions

#Clone the repo
git clone https://github.com/your-username/ivf-predictor.git
cd ivf-predictor

#Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate #This is for windows

#Install backend dependencies
cd backend
pip install -r requirements.txt

#Run the backend
uvicorn app.main:app --reload

#Backend will run at:http://127.0.0.1:8000

#Open the frontend with live server
frontend/index.html

