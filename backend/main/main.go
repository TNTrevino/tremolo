package main

// TODO: move the routers into a controller
import (
	"flag"
	"log"
	"os"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/generation"
	"sight-reading/logger"
	"sight-reading/middleware"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// init global deps
	logger.InitLogger()
	database.InitializeDBConnection()
	middleware.InitJWTSecret()

	// faker flag
	runPackage := flag.Bool("fake-it", false, "use this flag to generate data")
	flag.Parse()
	if *runPackage {
		generation.GenerateData()
	}

	router := gin.Default()

	allowedOrigins := []string{"http://localhost:5173"}
	originsEnv := os.Getenv("ALLOWED_ORIGINS")
	if originsEnv != "" {
		// parse comma-separated origins and trim whitespace
		origins := strings.Split(originsEnv, ",")
		allowedOrigins = make([]string, 0, len(origins))
		for _, origin := range origins {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}

		if len(allowedOrigins) == 0 {
			log.Panic("ALLOWED_ORIGINS environment variable is set but contains no valid origins")
		}
	}

	config := cors.DefaultConfig()
	config.AllowOrigins = allowedOrigins
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(config))

	controllers.SetupAuthRoutes(router)
	controllers.SetupTeacherRoutes(router)
	controllers.SetupChartRoutes(router)
	controllers.SetupUserInfoRoutes(router)
	controllers.SetupNoteGameRoutes(router)

	err := router.Run(":5001")
	if err != nil {
		panic(err.Error())
	}
}
