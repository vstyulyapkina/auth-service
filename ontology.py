from rdflib import Graph, RDF, OWL, RDFS, URIRef, XSD

def get_label_or_fragment(entity):
    return str(entity.split('#')[-1]) if isinstance(entity, URIRef) else str(entity)

def load_and_process_owl(file_path):
    g = Graph()
    g.parse(file_path, format="xml")
    criteria = {}

    for class_ in g.subjects(RDF.type, OWL.Class):
        class_label = get_label_or_fragment(class_)
        criteria[class_label] = []

        for restriction in g.objects(class_, RDFS.subClassOf):
            if (restriction, RDF.type, OWL.Restriction) in g:
                on_property = g.value(restriction, OWL.onProperty)
                property_label = get_label_or_fragment(on_property)

                restriction_details = analyze_restriction(restriction, g)
                criteria[class_label].append({"property": property_label, "details": restriction_details})

    return g, criteria

def extract_numerical_restrictions(restriction_node, graph):
    numerical_restrictions = {}
    for restriction in graph.objects(subject=restriction_node, predicate=OWL.withRestrictions):
        for rest_item in graph.items(restriction):
            for p, o in graph.predicate_objects(subject=rest_item):
                key = p.split('#')[-1]
                numerical_restrictions[key] = o.value
    return numerical_restrictions

def analyze_restriction(restriction, graph):
    restrictions = {}
    for p, o in graph.predicate_objects(restriction):
        if p == OWL.onProperty:
            continue
        elif p in [XSD.minInclusive, XSD.maxInclusive, XSD.minExclusive, XSD.maxExclusive]:
            restrictions[str(p.split('#')[-1])] = str(o)
        elif p in [OWL.someValuesFrom, OWL.allValuesFrom]:
            oneOf_collection = graph.value(o, OWL.oneOf)
            if oneOf_collection:
                values = []
                for item in graph.items(oneOf_collection):
                    literal_value = graph.value(item, RDF.value)
                    if literal_value:
                        values.append(str(literal_value))
                restrictions["values"] = values
            else:
                numerical_restrictions = extract_numerical_restrictions(o, graph)
                restrictions.update(numerical_restrictions)
    return restrictions

def determine_scale_type(restrictions):
    if 'values' in restrictions:
        return 'Качественный'
    return 'Количественный'


def generate_evaluation_scales(criteria, graph):
    scales = {}
    for class_name, properties in criteria.items():
        for prop in properties:
            property_name = prop["property"]
            restrictions = prop["details"]
            scale_type = determine_scale_type(restrictions)
            scales[property_name] = {"type": scale_type, "details": restrictions}
    return scales


owl_file_path = r'C:\Data\cinema.owl'

g, criteria = load_and_process_owl(owl_file_path)

evaluation_scales = generate_evaluation_scales(criteria, g)

for prop, details in evaluation_scales.items():
    print(f"Свойство: {prop}, Тип шкалы: {details['type']}, Ограничения: {details['details']}")

