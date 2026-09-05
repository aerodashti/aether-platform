import net.ltgt.gradle.errorprone.errorprone

plugins {
  java
  jacoco
  checkstyle
  id("org.springframework.boot") version "3.5.3"
  id("io.spring.dependency-management") version "1.1.7"
  id("com.diffplug.spotless") version "7.0.4"
  id("net.ltgt.errorprone") version "4.1.0"
}

group = "br.com.aerodash"
version = "0.1.0"

java {
  toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories {
  mavenCentral()
}

val versaoMapstruct = "1.6.3"
val versaoArchunit = "1.3.2"

dependencies {
  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
  implementation("org.springframework.boot:spring-boot-starter-validation")
  implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.6")
  implementation("net.logstash.logback:logstash-logback-encoder:8.1")
  implementation("org.mapstruct:mapstruct:$versaoMapstruct")
  annotationProcessor("org.mapstruct:mapstruct-processor:$versaoMapstruct")

  implementation("org.flywaydb:flyway-core")
  runtimeOnly("org.flywaydb:flyway-database-postgresql")
  runtimeOnly("org.postgresql:postgresql")

  errorprone("com.google.errorprone:error_prone_core:2.38.0")

  testImplementation("org.springframework.boot:spring-boot-starter-test")
  testImplementation("com.tngtech.archunit:archunit-junit5:$versaoArchunit")
  testImplementation("org.springframework.boot:spring-boot-testcontainers")
  testImplementation("org.testcontainers:junit-jupiter")
  testImplementation("org.testcontainers:postgresql")
  testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// Spotless: google-java-format é o formatador; não há discussão de estilo em code review.
spotless {
  java {
    target("src/**/*.java")
    googleJavaFormat("1.24.0")
    removeUnusedImports()
    trimTrailingWhitespace()
    endWithNewline()
  }
  kotlinGradle {
    target("*.gradle.kts")
    ktlint()
  }
}

checkstyle {
  toolVersion = "10.20.1"
  configFile = file("config/checkstyle/checkstyle.xml")
  maxWarnings = 0
  isIgnoreFailures = false
}

tasks.withType<JavaCompile>().configureEach {
  options.encoding = "UTF-8"
  options.compilerArgs.add("-parameters")
  // O código gerado por MapStruct e Hibernate não é nosso: não faz sentido analisá-lo.
  options.errorprone {
    disableWarningsInGeneratedCode = true
    excludedPaths = ".*/build/generated/.*"
  }
}

// O `test` padrão não exige Docker: quem precisa de contêiner está em `testeIntegracao`.
tasks.named<Test>("test") {
  useJUnitPlatform { excludeTags("integracao") }
  finalizedBy(tasks.named("jacocoTestReport"))
}

tasks.register<Test>("testeIntegracao") {
  group = "verification"
  description = "Testes marcados com @Tag(\"integracao\"). Exige Docker rodando."
  testClassesDirs = sourceSets["test"].output.classesDirs
  classpath = sourceSets["test"].runtimeClasspath
  useJUnitPlatform { includeTags("integracao") }
  shouldRunAfter(tasks.named("test"))

  // O docker-java embutido no Testcontainers fala a API 1.32 do Docker por padrão, e o Docker
  // Engine 25+ recusa qualquer coisa abaixo da 1.40 com HTTP 400. A 1.41 existe desde o Docker
  // 20.10, então cobre da versão mais antiga que suportamos até a atual.
  systemProperty("api.version", "1.41")
}

tasks.named<JacocoReport>("jacocoTestReport") {
  dependsOn(tasks.named("test"))
  reports {
    xml.required = true
    html.required = true
  }
}
