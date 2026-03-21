import argparse
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    parser = argparse.ArgumentParser(description="Run FastAPI server")

    parser.add_argument(
        "--env",
        choices=["development", "production"],
        default="development",
        help="Environment mode"
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of workers (used only in production)"
    )

    args = parser.parse_args()

    # Get port from .env or default to 8000
    port = int(os.getenv("FAST_API_PORT", 8000))

    if args.env == "development":
        print(f"Starting development server on port {port} with reload...")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="debug"
        )

    elif args.env == "production":
        print(f"Starting production server on port {port} with {args.workers} workers...")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            workers=args.workers,
            log_level="info"
        )


if __name__ == "__main__":
    main()
