var getRequests = async (
  cswEndpoint: string,
  cqlQuery: string,
  maxRecords = 0
) => {
  let url = `${cswEndpoint}?request=GetRecords&Service=CSW&Version=2.0.2&typeNames=gmd:MD_Metadata&resultType=hits&constraint=${cqlQuery}&constraintLanguage=CQL_TEXT&constraint_language_version=1.1.0`;
  let res = await fetch(url);
  if (!res.ok) return;
  let data = await res.text();
  let parser = new DOMParser();
  let xmlDoc = parser.parseFromString(data, 'text/xml');
  let recordsNodes = xmlDoc.querySelectorAll('SearchResults');
  let totalNumberRecords = parseInt(
    recordsNodes[0].getAttribute('numberOfRecordsMatched')
  );
  let pageSize = 50;
  if (maxRecords < 50 && maxRecords > 0) {
    pageSize = maxRecords;
  }
  let startPosition = 1;
  let promises = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let url = `${cswEndpoint}?request=GetRecords&Service=CSW&Version=2.0.2&typeNames=gmd:MD_Metadata&resultType=results&constraint=${cqlQuery}&constraintLanguage=CQL_TEXT&constraint_language_version=1.1.0&startPosition=${startPosition}&maxRecords=${pageSize}`;
    let prom = fetch(url);
    promises.push(prom);
    startPosition += pageSize;
    if (startPosition > totalNumberRecords) break;
  }
  return promises;
};

class Record {
  constructor(
    public title: number,
    public id: number,
    public abstract: number,
    public keywords: string[]
  ) {}
}

var getCSWRecords = async (
  cswEndpoint: string,
  cqlQuery: string,
  maxRecords = 0
) => {
  let records: Record[] = [];
  let promises = getRequests(cswEndpoint, cqlQuery, maxRecords);
  const responses = await promises;
  const responseBodies = await Promise.all(responses).then((bodies) => {
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
    let recordsNodes = xmlDoc.querySelectorAll('SummaryRecord');
    for (let i = 0; i < recordsNodes.length; ++i) {
      let recordNode = recordsNodes[i];
      let mdId = recordNode.querySelectorAll('identifier')[0].textContent;
      let mdTitle = recordNode.querySelectorAll('title')[0].textContent;
      let abstract = recordNode.querySelectorAll('abstract')[0].textContent;
      // let modified = recordNode.querySelectorAll("modified")[0].textContent
      let kws: string[] = [];

      recordNode.querySelectorAll('subject').forEach(function (item) {
        if (item.textContent !== null) {
          kws.push(item.textContent);
        }
      });
      let record: Record = new Record(mdTitle, mdId, abstract, kws);
      records.push(record);
    }
  });
  return records;
};

function getServiceUrl(xmlDoc: Document) {
  let onlineResNode = xmlDoc.querySelectorAll(
    'connectPoint CI_OnlineResource linkage URL'
  );
  let url = '';
  if (onlineResNode && onlineResNode.length > 0) {
    url: string = onlineResNode[0].textContent;
  }
  if (url.endsWith('/WMTSCapabilities.xml')) {
    url = url.replace('/WMTSCapabilities.xml', '');
  }
  return url;
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

function getOperatesOnSourceId(xmlDoc: Document) {
  let operatesOnNode = xmlDoc.querySelectorAll(
    'SV_ServiceIdentification operatesOn'
  );
  if (operatesOnNode && operatesOnNode.length > 0) {
    let resourceUrl = operatesOnNode[0].getAttribute('xlink:href');
    if (resourceUrl.includes('#')) {
      resourceUrl = resourceUrl.split('#')[0];
    }
    const urlSearchParams = new URLSearchParams(resourceUrl.toLowerCase());
    let dsSourceId = Object.fromEntries(urlSearchParams.entries())['id'];
    return dsSourceId;
  }
  return '';
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

interface NSMap {
  [name: string]: string;
}

function getInspireConformance(xmlDoc: Document) {
  const inspConformanceString =
    'VERORDENING (EU) Nr. 1089/2010 VAN DE COMMISSIE van 23 november 2010 ter uitvoering van Richtlijn 2007/2/EG van het Europees Parlement en de Raad betreffende de interoperabiliteit van verzamelingen ruimtelijke gegevens en van diensten met betrekking tot ruimtelijke gegevens';
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

  function nsResolver(prefix: string) {
    if (!Object.keys(NS).includes(prefix))
      throw `namespace prefix ${prefix} not declared in nsResolver`;
    return NS[prefix];
  }

  function getPass(xmlDoc: Document, xpath: string, nsResolver) {
    let conformances = xmlDoc.evaluate(
      xpath,
      xmlDoc,
      nsResolver,
      XPathResult.ANY_TYPE,
      null
    );
    var resultNode = conformances.iterateNext();
    while (resultNode) {
      let passNode = resultNode.querySelector('pass Boolean');
      if (passNode) {
        return passNode.textContent;
      }
    }
    return null;
  }
  let xpathString = `//gmd:DQ_ConformanceResult[contains(gmd:specification/gmd:CI_Citation/gmd:title/gco:CharacterString,'${inspConformanceString}')]`;
  let xpathAnchor = `//gmd:DQ_ConformanceResult[contains(gmd:specification/gmd:CI_Citation/gmd:title/gmx:Anchor,'${inspConformanceString}')]`;
  let result = getPass(xmlDoc, xpathString, nsResolver);
  if (!result) {
    result = getPass(xmlDoc, xpathAnchor, nsResolver);
  }
  return result;
}

var getCSWRecord = async (cswEndpoint: string, mdIdentifier: string) => {
  let url = `${cswEndpoint}?service=CSW&request=GetRecordById&version=2.0.2&outputSchema=http://www.isotc211.org/2005/gmd&elementSetName=full&id=${mdIdentifier}#MD_DataIdentification`;
  let res = await fetch(url);
  if (!res.ok) return '';
  let data = await res.text();

  let parser = new DOMParser();
  let xmlDoc: Document = parser.parseFromString(data, 'text/xml');
  let resourceType = getResourceType(xmlDoc);
  if (!resourceType) {
    console.log(
      `WARNING: could not find metadata for record with id ${mdIdentifier} in catalog, url: ${url}`
    );
    return null;
  }
  if (resourceType === 'service') {
    return getSvcCswRecord(xmlDoc);
  } else if (resourceType === 'dataset') {
    return getDsCswRecord(mdIdentifier, xmlDoc);
  }
};

var getDsCswRecord = async (mdIdentifier: string, xmlDoc: Document) => {
  return {
    id: mdIdentifier,
    datasetInspireConformance: getInspireConformance(xmlDoc),
    datasetMdStandardVersion: getMdStandardVersion(xmlDoc),
    datasetMdContactEmail: getMdContact(xmlDoc),
  };
};

var getSvcCswRecord = async (xmlDoc: Document) => {
  let serviceUrl = getServiceUrl(xmlDoc);
  // try with https immediately, since http wont work
  serviceUrl = serviceUrl.replace('http://', 'https://');
  let protocol = getServiceProtocol(xmlDoc);
  let operatesOnMdId = getOperatesOnSourceId(xmlDoc);
  let serviceType = getServiceType(xmlDoc);
  let serviceProvider = getServiceProvider(xmlDoc);
  return {
    url: serviceUrl,
    protocol: protocol,
    datasetSourceMdId: operatesOnMdId,
    serviceType: serviceType,
    serviceProvider: serviceProvider,
  };
};

var getCSWRecordsWithUrl = async (
  cswEndpoint: string,
  cqlQuery: string,
  maxRecords = 0
) => {
  let records = await getCSWRecords(cswEndpoint, cqlQuery, maxRecords);
  for (let i = 0; i < records.length; ++i) {
    let record = records[i];
    let data = await getCSWRecord(cswEndpoint, record.id);
    Object.assign(record, data);
  }
  return records;
};

export default {
  getCSWRecord,
  getCSWRecordsWithUrl,
  getCSWRecords,
  getRequests,
};
