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
val versaoOtelInstrumentacao = "2.31.1"

// O BOM do Spring Boot fixa o core do OpenTelemetry numa versão mais antiga que a exigida pela
// instrumentação; sem este override a instrumentação 2.31.1 roda sobre o SDK 1.49 e quebra em
// runtime com NoSuchMethodError.
extra["opentelemetry.version"] = "1.65.0"

dependencies {
  // Instrumentação OpenTelemetry via SDK (sem Java Agent): a configuração fica visível no código.
  implementation(
    platform("io.opentelemetry.instrumentation:opentelemetry-instrumentation-bom:$versaoOtelInstrumentacao"),
  )
  implementation("io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter")
  implementation("io.opentelemetry:opentelemetry-exporter-logging")
  // Os módulos de Logback moram no BOM alpha porque a OTel mantém a instrumentação lá; o que
  // usamos deles é só o nome de duas classes de appender no logback-spring.xml.
  implementation(
    platform("io.opentelemetry.instrumentation:opentelemetry-instrumentation-bom-alpha:$versaoOtelInstrumentacao-alpha"),
  )
  implementation("io.opentelemetry.instrumentation:opentelemetry-logback-mdc-1.0")
  implementation("io.opentelemetry.instrumentation:opentelemetry-logback-appender-1.0")

  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
  implementation("org.springframework.boot:spring-boot-starter-validation")
  // Envio do código de recuperação. É o JavaMailSender do Spring: sem cliente HTTP de terceiro.
  implementation("org.springframework.boot:spring-boot-starter-mail")
  // Só o BCrypt, não o starter inteiro: `spring-security-crypto` é uma biblioteca sem
  // auto-configuração, então não instala filtro nem tranca endpoint. O starter completo entra
  // junto com a área logada, quando existir autorização para configurar. Ver ADR 0013.
  implementation("org.springframework.security:spring-security-crypto")
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
