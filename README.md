# Lucaverse.com

## Overview

Lucaverse.com is a personal portfolio and showcase website for Luca, a Data Analyst and AI enthusiast. The site serves as a central hub for his knowledge, creations, automations, and discoveries, aiming to help others navigate and build with AI, data, and open technologies. It features sections detailing his mission, vision, technical expertise, impactful projects, custom GPTs, and a contact form.

## Features

- **Hero Section:** Engaging introduction to Lucaverse with mission and vision statements.
- **About Me:** Detailed insights into Luca's background, passion for automation, and a comprehensive list of technical expertise.
- **My Projects:** A showcase of key projects in AI and data analytics, including:
    - Audio Transcription Project
    - Screen Scrape
    - Finance Deep Analysis
- **Custom GPTs:** Highlights specialized AI assistants developed by Luca, such as:
    - PythonGPT
    - MysqlGPT
    - PromptMasterGPT
- **Blog (Coming Soon):** Placeholder for future insights and perspectives on AI, machine learning, and data science.
- **Contact Form:** A dedicated section for inquiries and collaborations.
- **Responsive Design:** Modern, dark-themed interface with interactive background elements.

## Technologies Used

- **Frontend:** React.js
- **Build Tool:** Vite
- **Styling:** CSS Modules, Font Awesome, Custom CSS
- **Interactivity:** particles.js (for background effects)
- **Icons:** React Icons

## Installation

To set up the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/lucaverse.com.git
   cd lucaverse.com
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

To run the development server:

```bash
npm run dev
```

This will start the Vite development server, and you can view the application in your browser, usually at `http://localhost:5173`.

To build the project for production:

```bash
npm run build
```

This will compile the project into the `dist` directory, ready for deployment.

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
lucaverse.com/
├── public/                 # Static assets (images, favicon, global CSS)
├── src/                    # React source code
│   ├── App.jsx             # Main application component
│   ├── index.css           # Global styles
│   ├── main.jsx            # Entry point for React app
│   └── components/         # Reusable React components
│       ├── About/
│       ├── AccessRequestForm/
│       ├── Background/
│       ├── Blog/
│       ├── Contact/
│       ├── CustomGPTs/
│       ├── Footer/
│       ├── Header/
│       ├── Hero/
│       └── Projects/
├── .gitignore
├── index.html              # Main HTML file
├── package.json            # Project dependencies and scripts
├── package-lock.json
├── vite.config.js          # Vite configuration
└── README.md               # This file
```

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License.

## Contact

For any inquiries, please reach out via the contact form on the website or connect with Luca on social media (links available in the footer).
