import { Iso19115Record } from './models';

export var getRecordsUrl = (
  cswEndpoint: string,
  cqlQuery: string,
  resultType: string = 'results'
): string => {
  return `${cswEndpoint}?request=GetRecords&Service=CSW&Version=2.0.2&typeNames=gmd:MD_Metadata&constraint=${cqlQuery}&constraintLanguage=CQL_TEXT&constraint_language_version=1.1.0&outputSchema=http://www.isotc211.org/2005/gmd&elementSetName=full&resultType=${resultType}`;
};

var getCswPromises = async (
  cswEndpoint: string,
  cqlQuery: string,
  maxRecords = -1,
  debugRecordsUrl = ''
) => {
  if (debugRecordsUrl !== '') {
    return [fetch(debugRecordsUrl)];
  }
  let urlHits = `${getRecordsUrl(cswEndpoint, cqlQuery, 'hits')}`;
  let res = await fetch(urlHits);
  if (!res.ok) return;
  let data = await res.text();
  let parser = new DOMParser();
  let xmlDoc = parser.parseFromString(data, 'text/xml');
  let recordsNodes = xmlDoc.querySelectorAll('SearchResults');
  let nrMatched: string | null = recordsNodes[0].getAttribute(
    'numberOfRecordsMatched'
  );
  let nrMatchedInt = parseInt(nrMatched !== null ? nrMatched : '-1');
  let pageSize = 20;
  let promises = [];
  let startPosition = 1;

  // eslint-disable-next-line no-constant-condition
  // TODO: await promises in this already async function
  let urlResults = getRecordsUrl(cswEndpoint, cqlQuery);
  while (true) {
    let pagedUrl = `${urlResults}&startPosition=${startPosition}&maxRecords=${pageSize}`;

    let prom = fetch(pagedUrl);
    promises.push(prom);
    startPosition += pageSize;
    if (
      startPosition > nrMatchedInt ||
      (maxRecords != -1 && startPosition >= maxRecords)
    )
      break;
  }
  return promises;
};

export var getCSWRecords = async (
  cswEndpoint: string,
  cqlQuery: string,
  maxRecords = -1,
  debugRecordsUrl = ''
): Promise<Iso19115Record[] | undefined> => {
  let records: Iso19115Record[] = [];
  let promises: Promise<Promise<Response>[] | undefined> = getCswPromises(
    cswEndpoint,
    cqlQuery,
    maxRecords,
    debugRecordsUrl
  );
  const responses: Promise<Response>[] | undefined = await promises;
  if (responses === undefined) {
    return;
  }

  const responseBodies = await Promise.all(responses!).then((bodies) => {
    return Promise.all(
      bodies.map((body) => {
        return body.text();
      })
    ).then((data) => {
      return data;
    });
  });
  responseBodies.forEach((body) => {
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(body, 'text/xml');
    let recordsNodes = xmlDoc.querySelectorAll('MD_Metadata');
    for (let i = 0; i < recordsNodes.length; ++i) {
      let recordDoc = recordsNodes[i];
      let recordDocDoc = parser.parseFromString(
        recordDoc.outerHTML,
        'text/xml'
      );
      let title: string = getTitle(recordDocDoc);
      let mdId: string = getMdId(recordDocDoc);
      let abstract: string = getAbstract(recordDocDoc);

      let kws: string[] = getElementsByText(
        ".//gmd:descriptiveKeywords[not(.//gmd:thesaurusName) or .//gmd:thesaurusName/gmd:CI_Citation[.//gmd:title/@gco:nilReason = 'missing'] ]/gmd:MD_Keywords/gmd:keyword/gco:CharacterString",
        recordDocDoc
      );
      let organisationUrl = '';
      let organisationName = getStringValXpath(
        recordDocDoc,
        '//gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty/gmd:organisationName/gco:CharacterString'
      );
      if (organisationName === '') {
        organisationName = getStringValXpath(
          recordDocDoc,
          '//gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty/gmd:organisationName/gmx:Anchor'
        );
        organisationUrl = getStringValXpath(
          recordDocDoc,
          '//gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty/gmd:organisationName/gmx:Anchor/@xlink:href'
        );
      }

      let record: Iso19115Record = new Iso19115Record(
        title,
        mdId,
        abstract,
        kws,
        organisationName,
        organisationUrl
      );
      records.push(record);
    }
  });
  return records;
};

function getStringValXpath(xmlDoc: Document, xpath: string): string {
  let xpathResult = xmlDoc.evaluate(
    xpath,
    xmlDoc,
    xpathResolver,
    XPathResult.STRING_TYPE,
    null
  );
  return xpathResult.stringValue;
}

function getElementsByText(xpath: string, xmlDoc: Document): string[] {
  var results: string[] = [];
  var xpathResult = xmlDoc.evaluate(
    xpath,
    xmlDoc,
    xpathResolver,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    null
  );
  var node;
  while ((node = xpathResult.iterateNext()) != null) {
    if (node.textContent !== null) {
      results.push(node.textContent);
    }
  }
  return results;
}

interface NSMap {
  [name: string]: string;
}

const xpathResolver: XPathNSResolver = {
  lookupNamespaceURI: (prefix) => {
    const NS: NSMap = {
      csw: 'http://www.opengis.net/cat/csw/2.0.2',
      dc: 'http://purl.org/dc/elements/1.1/',
      dct: 'http://purl.org/dc/terms/',
      gmd: 'http://www.isotc211.org/2005/gmd',
      gco: 'http://www.isotc211.org/2005/gco',
      geonet: 'http://www.fao.org/geonetwork',
      gmx: 'http://www.isotc211.org/2005/gmx',
      gts: 'http://www.isotc211.org/2005/gts',
      srv: 'http://www.isotc211.org/2005/srv',
      xlink: 'http://www.w3.org/1999/xlink',
    };
    if (prefix === null || !Object.keys(NS).includes(prefix)) return null;
    let val = NS[prefix];
    return val;
  },
};

function getMdId(xmlDoc: Document): string {
  const xpath: string = '//gmd:fileIdentifier/gco:CharacterString';
  return getStringValXpath(xmlDoc, xpath);
}

function getTitle(xmlDoc: Document): string {
  // const recordType = 'dataset';
  const resourceIdentification = 'gmd:MD_DataIdentification';
  const xpath: string = `//gmd:identificationInfo/${resourceIdentification}/gmd:citation/gmd:CI_Citation/gmd:title/gco:CharacterString/text()`;
  return getStringValXpath(xmlDoc, xpath);
}

function getAbstract(xmlDoc: Document): string {
  // const recordType = 'dataset';
  const resourceIdentification = 'gmd:MD_DataIdentification';
  const xpath: string = `//gmd:identificationInfo/${resourceIdentification}/gmd:abstract/gco:CharacterString/text()`;
  return getStringValXpath(xmlDoc, xpath);
}

function getServiceUrl(xmlDoc: Document) {
  let onlineResNode = xmlDoc.querySelectorAll(
    'connectPoint CI_OnlineResource linkage URL'
  );
  let urlString: string = '';
  if (onlineResNode && onlineResNode.length > 0) {
    let url: string | null = onlineResNode[0].textContent;
    urlString = url !== null ? url : '';
  }
  if (urlString.endsWith('/WMTSCapabilities.xml')) {
    urlString = urlString.replace('/WMTSCapabilities.xml', '');
  }
  return urlString;
}

function getServiceProtocol(xmlDoc: Document) {
  let protNode = xmlDoc.querySelectorAll(
    'onLine CI_OnlineResource protocol Anchor'
  );
  if (protNode && protNode.length === 0) {
    protNode = xmlDoc.querySelectorAll(
      'onLine CI_OnlineResource protocol CharacterString'
    );
  }
  if (protNode && protNode.length > 0) {
    return protNode[0].textContent;
  }
  return '';
}

function getInspireConformance(xmlDoc: Document) {
  const inspConformanceString =
    'VERORDENING (EU) Nr. 1089/2010 VAN DE COMMISSIE van 23 november 2010 ter uitvoering van Richtlijn 2007/2/EG van het Europees Parlement en de Raad betreffende de interoperabiliteit van verzamelingen ruimtelijke gegevens en van diensten met betrekking tot ruimtelijke gegevens';

  function getPass(xmlDoc: Document, xpath: string) {
    let conformances = xmlDoc.evaluate(
      xpath,
      xmlDoc,
      xpathResolver,
      XPathResult.ANY_TYPE,
      null
    );
    var resultNode: Node = conformances.iterateNext()!;
    while (resultNode) {
      let passNode = (resultNode.parentNode as HTMLElement).querySelector(
        'pass Boolean'
      );
      if (passNode) {
        return passNode.textContent;
      }
    }
    return null;
  }
  let xpathString = `//gmd:DQ_ConformanceResult[contains(gmd:specification/gmd:CI_Citation/gmd:title/gco:CharacterString,'${inspConformanceString}')]`;
  let xpathAnchor = `//gmd:DQ_ConformanceResult[contains(gmd:specification/gmd:CI_Citation/gmd:title/gmx:Anchor,'${inspConformanceString}')]`;
  let result = getPass(xmlDoc, xpathString);
  if (!result) {
    result = getPass(xmlDoc, xpathAnchor);
  }
  return result;
}

function getServiceProvider(xmlDoc: Document) {
  let queryBase =
    'SV_ServiceIdentification pointOfContact CI_ResponsibleParty organisationName';
  let queryCharacterString = `${queryBase} CharacterString`;
  let queryAnchor = `${queryBase} Anchor`;
  let serviceProvider = xmlDoc.querySelector(queryCharacterString);
  if (serviceProvider) {
    return serviceProvider.textContent;
  } else {
    serviceProvider = xmlDoc.querySelector(queryAnchor);
    if (serviceProvider) {
      return serviceProvider.textContent;
    }
  }
  return '';
}

function getResourceType(xmlDoc: Document) {
  let resourceType = xmlDoc.querySelectorAll('DQ_Scope level MD_ScopeCode');
  if (resourceType && resourceType.length > 0) {
    return resourceType[0].getAttribute('codeListValue');
  }
  return '';
}

function getServiceType(xmlDoc: Document) {
  let svcTypeName = xmlDoc.querySelector('serviceType LocalName');
  if (svcTypeName) {
    return svcTypeName.textContent;
  }
  return '';
}

function getMdIdentifier(xmlDoc: Document) {
  let mdIdentifier = xmlDoc.querySelector('fileIdentifier CharacterString');
  if (mdIdentifier) {
    return mdIdentifier.textContent;
  }
  return '';
}

function getMdStandardVersion(xmlDoc: Document) {
  let version = xmlDoc.querySelector('metadataStandardVersion CharacterString');
  if (version) {
    return version.textContent;
  }
  return '';
}

function getMdContact(xmlDoc: Document) {
  let mdContactEmail = xmlDoc.querySelector(
    'contact CI_ResponsibleParty contactInfo CI_Contact address CI_Address electronicMailAddress CharacterString'
  );
  if (mdContactEmail) {
    return mdContactEmail.textContent;
  }
  return '';
}
