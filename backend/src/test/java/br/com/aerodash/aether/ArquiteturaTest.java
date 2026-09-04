package br.com.aerodash.aether;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * As quatro regras de arquitetura do Aether. Elas são parte do build: relaxar qualquer uma exige um
 * ADR, não uma exceção local. Veja {@code docs/arquitetura.md} e {@code docs/testes.md}.
 */
@AnalyzeClasses(
    packages = "br.com.aerodash.aether",
    importOptions = ImportOption.DoNotIncludeTests.class)
class ArquiteturaTest {

  @ArchTest
  static final ArchRule nenhumCicloEntrePacotesDeFeature =
      slices()
          .matching("br.com.aerodash.aether.(*)..")
          .should()
          .beFreeOfCycles()
          .because("uma feature não pode depender de outra: elas se comunicam pelo servidor");

  @ArchTest
  static final ArchRule controllerNaoAcessaRepository =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Controller")
          .should()
          .dependOnClassesThat()
          .haveSimpleNameEndingWith("Repository")
          .because("a orquestração passa pelo Service, nunca do Controller direto para o banco");

  @ArchTest
  static final ArchRule entidadeNaoApareceNaBordaHttp =
      noClasses()
          .that()
          .haveSimpleNameEndingWith("Controller")
          .should(exporEntidadeEmMetodoPublico())
          .because("a borda HTTP fala em DTO; entidade JPA não é contrato de API");

  @ArchTest
  static final ArchRule nenhumaClasseUsaSaidaPadrao =
      NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS.because(
          "todo log passa pelo SLF4J: System.out, System.err e printStackTrace não são log");

  private static ArchCondition<JavaClass> exporEntidadeEmMetodoPublico() {
    return new ArchCondition<>("expor uma classe @Entity em método público") {
      @Override
      public void check(JavaClass classe, ConditionEvents eventos) {
        for (JavaMethod metodo : classe.getMethods()) {
          if (!metodo.getModifiers().contains(JavaModifier.PUBLIC)) {
            continue;
          }
          for (JavaClass tipo : tiposDaAssinatura(metodo)) {
            if (tipo.isAnnotatedWith(Entity.class)) {
              eventos.add(
                  SimpleConditionEvent.satisfied(
                      metodo,
                      metodo.getFullName() + " expõe a entidade " + tipo.getSimpleName()));
            }
          }
        }
      }
    };
  }

  private static Set<JavaClass> tiposDaAssinatura(JavaMethod metodo) {
    Set<JavaClass> tipos = new LinkedHashSet<>();
    tipos.add(metodo.getRawReturnType());
    tipos.addAll(metodo.getRawParameterTypes());
    return tipos;
  }
}
