/**
 * i18n.js Tests
 * Imports the real i18n module (no mocks) to verify:
 * 1. The module initializes without throwing.
 * 2. The initialized instance exposes the expected translation resources.
 *
 * Coverage: importing i18n.js executes the entire file (use/init chain),
 * giving 100% statement/line/function/branch coverage for i18n.js.
 */

// No mocks — import the real module so all code paths execute.
import i18n from '../../src/i18n.js';

describe('i18n module', () => {
  it('exports i18n instance as default', () => {
    expect(i18n).toBeDefined();
    expect(typeof i18n).toBe('object');
  });

  it('is initialized (isInitialized or has t function)', () => {
    // After .init() the instance should have a t() translation function
    expect(typeof i18n.t).toBe('function');
  });

  it('has English resource bundle', () => {
    const en = i18n.getResourceBundle('en', 'translation');
    expect(en).toBeDefined();
    expect(typeof en).toBe('object');
  });

  it('has Portuguese resource bundle', () => {
    const pt = i18n.getResourceBundle('pt', 'translation');
    expect(pt).toBeDefined();
    expect(typeof pt).toBe('object');
  });

  describe('English translations', () => {
    let en;
    beforeAll(() => {
      en = i18n.getResourceBundle('en', 'translation');
    });

    it('has "home" key', () => expect(en.home).toBe('Home'));
    it('has "about" key', () => expect(en.about).toBe('About'));
    it('has "projects" key', () => expect(en.projects).toBe('Projects'));
    it('has "blog" key', () => expect(en.blog).toBe('Blog'));
    it('has "contactMe" key', () => expect(en.contactMe).toBe('Contact Me'));
    it('has "newsletter" key', () => expect(en.newsletter).toBe('Newsletter'));
    it('has "sendMessage" key', () => expect(en.sendMessage).toBe('Send Message'));
    it('has "tryIt" key', () => expect(en.tryIt).toBe('Try It'));
    it('has "copyright" key containing {{year}}', () => expect(en.copyright).toContain('{{year}}'));
    it('has nested "skills" object', () => {
      expect(typeof en.skills).toBe('object');
      expect(en.skills.python).toBe('Python');
      expect(en.skills.dataAnalysis).toBe('Data Analysis & Transformation');
    });
    it('has nested "tags" object', () => {
      expect(typeof en.tags).toBe('object');
      expect(en.tags.openAI).toBe('OpenAI');
      expect(en.tags.finance).toBe('Finance');
    });
    it('has nested "gptTags" object', () => {
      expect(typeof en.gptTags).toBe('object');
      expect(en.gptTags.python).toBe('Python');
      expect(en.gptTags.llm).toBe('LLM');
    });
    it('has nested "login" object', () => {
      expect(typeof en.login).toBe('object');
      expect(en.login.continueWithGoogle).toBe('Continue with Google');
      expect(en.login.secureConnection).toBe('SECURE CONNECTION ESTABLISHED');
    });
    it('has access request keys', () => {
      expect(en.submittingAccessRequest).toContain('access request');
      expect(en.accessRequestSuccess).toContain('Lucaverse');
      expect(en.accessRequestError).toBeDefined();
      expect(en.accessRequestLocalDev).toBeDefined();
    });
    it('has contact form notification keys', () => {
      expect(en.sendingMessage).toBeDefined();
      expect(en.contactSuccess).toContain('Luca');
      expect(en.contactError).toBeDefined();
      expect(en.contactLocalDev).toBeDefined();
    });
    it('has privacy consent keys', () => {
      expect(en.dataPrivacyConsent).toBe('Data Privacy & Consent');
      expect(en.acceptAll).toBe('Accept All');
      expect(en.acceptEssentialOnly).toBe('Essential Only');
    });
    it('has hero keys', () => {
      expect(en.heroWelcome).toBe('Welcome');
      expect(en.heroLucaverse).toBe('Lucaverse');
      expect(en.heroMission).toBe('Mission');
      expect(en.heroVision).toBe('Vision');
    });
    it('has project keys', () => {
      expect(en.audioTranscriptionTitle).toBeDefined();
      expect(en.screenScrapeTitle).toBe('Screen Scrape');
      expect(en.financeAnalysisTitle).toBeDefined();
      expect(en.viewOnGithub).toBe('View on GitHub');
    });
    it('has GPT keys', () => {
      expect(en.pythonGptTitle).toBe('PythonGPT');
      expect(en.mysqlGptTitle).toBe('MysqlGPT');
      expect(en.promptMasterGptTitle).toBe('PromptMasterGPT');
    });
  });

  describe('Portuguese translations', () => {
    let pt;
    beforeAll(() => {
      pt = i18n.getResourceBundle('pt', 'translation');
    });

    it('has "home" key in Portuguese', () => expect(pt.home).toBe('Início'));
    it('has "about" key in Portuguese', () => expect(pt.about).toBe('Sobre'));
    it('has "contactMe" key in Portuguese', () => expect(pt.contactMe).toBe('Fale Comigo'));
    it('has "sendMessage" key in Portuguese', () => expect(pt.sendMessage).toBe('Enviar Mensagem'));
    it('has "tryIt" key in Portuguese', () => expect(pt.tryIt).toBe('Experimente'));
    it('has "copyright" key in Portuguese', () => {
      expect(pt.copyright).toContain('{{year}}');
      expect(pt.copyright).toContain('Todos os direitos reservados');
    });
    it('has nested "skills" object in Portuguese', () => {
      expect(typeof pt.skills).toBe('object');
      expect(pt.skills.python).toBe('Python');
      expect(pt.skills.dataAnalysis).toBe('Análise e Transformação de Dados');
    });
    it('has nested "tags" object in Portuguese', () => {
      expect(typeof pt.tags).toBe('object');
      expect(pt.tags.audio).toBe('Áudio');
      expect(pt.tags.finance).toBe('Finanças');
    });
    it('has nested "gptTags" object in Portuguese', () => {
      expect(typeof pt.gptTags).toBe('object');
      expect(pt.gptTags.coding).toBe('Codificação');
      expect(pt.gptTags.llm).toBe('LLM');
    });
    it('has nested "login" object in Portuguese', () => {
      expect(typeof pt.login).toBe('object');
      expect(pt.login.continueWithGoogle).toBe('Continuar com Google');
      expect(pt.login.secureConnection).toBe('CONEXÃO SEGURA ESTABELECIDA');
    });
    it('has access request keys in Portuguese', () => {
      expect(pt.accessRequestSuccess).toContain('Lucaverse');
      expect(pt.submittingAccessRequest).toBeDefined();
      expect(pt.accessRequestLocalDev).toBeDefined();
    });
    it('has contact form notification keys in Portuguese', () => {
      expect(pt.sendingMessage).toBeDefined();
      expect(pt.contactSuccess).toContain('Luca');
      expect(pt.contactLocalDev).toBeDefined();
    });
    it('has hero keys in Portuguese', () => {
      expect(pt.heroWelcome).toBe('Bem-vindo');
      expect(pt.heroMission).toBe('Missão');
      expect(pt.heroVision).toBe('Visão');
    });
    it('has project keys in Portuguese', () => {
      expect(pt.viewOnGithub).toBe('Ver no GitHub');
      expect(pt.screenScrapeTitle).toBe('Screen Scrape');
    });
    it('has GPT keys in Portuguese', () => {
      expect(pt.pythonGptTitle).toBe('PythonGPT');
      expect(pt.mysqlGptTitle).toBe('MysqlGPT');
    });
  });
});
