import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { makeExecutableSchema } from 'graphql-tools';
import { GraphQLSchema } from 'graphql';


export interface EntityApiOptions {
  entityTypeDef: String;
  queries: Array<any>;
  mutations: Array<any>;
}

const METADATA_KEY = 'EntityApiDecorator';

export const EntityApi = (options: EntityApiOptions) => {
  return function (target: Function) {
    Reflect.defineMetadata(METADATA_KEY, options, target);
  };
};

export const getEntityTypeDef = entity => {
  const metadata = Reflect.getMetadata(METADATA_KEY, entity);
  return metadata.entityTypeDef;
};

export const getEntityTypeDefs = entityArray => {
  return entityArray
    .map(entity => getEntityTypeDef(entity))
    .join('');
};

const getEntityQueryTypeDefs = (entity,queriesOrMutations) => {
  const metadata = Reflect.getMetadata(METADATA_KEY, entity);
  return metadata[queriesOrMutations]
    .map(query => query.typeDef + '\n')
    .join('');
};

const getTypeDefFor = (entityArray, queriesOrMutations, queryOrMutation) => {
  const entityQueryTypeDefs = entityArray
    .map(entity => getEntityQueryTypeDefs(entity, queriesOrMutations))
    .join('');
  return `type ${queryOrMutation} {
    ${entityQueryTypeDefs}
  }
  `;
};

export const getQueryTypeDef =
  entityArray => getTypeDefFor(entityArray, 'queries', 'Query');

export const getMutationTypeDef =
  entityArray => getTypeDefFor(entityArray, 'mutations', 'Mutation');

const getQueryName =
  typeDef => typeDef.substring(0, typeDef.match(/([^A-Z])/i).index);

const getQueryResolverPairsForEntity = (entity, queriesOrMutations) => {
  const metadata = Reflect.getMetadata(METADATA_KEY, entity);
  return metadata[queriesOrMutations]
    .map(query => [
      getQueryName(query.typeDef),
      query.resolver
    ]);
};

const pairsToObject = (pairs) => {
  return pairs.reduce((prev, curr) => {
    prev[curr[0]] = curr[1];
    return prev;
  }, {});
};

// returns an object: 
//   key is the name of the query or mutation
//   values are the resolvers
const getResolversFor = (entityArray, queriesOrMutations) => {
  const queryResolverPairs =
    entityArray.reduce((pairs, entity) => {
      const queryResolverPairsForEntity =
        getQueryResolverPairsForEntity(entity, queriesOrMutations);
      return pairs.concat(queryResolverPairsForEntity);
    }, []);
  return pairsToObject(queryResolverPairs);
};

export const getQueryResolvers =
  entityArray => getResolversFor(entityArray, 'queries');

export const getMutationResolvers =
  entityArray => getResolversFor(entityArray, 'mutations');

export const getApiSchema = entityArray => {
  const typeDefs =
    getEntityTypeDefs(entityArray) +
    getQueryTypeDef(entityArray) +
    getMutationTypeDef(entityArray);
  const resolvers = {
    Query: getQueryResolvers(entityArray),
    Mutation: getMutationResolvers(entityArray)
  };
  return makeExecutableSchema({
    typeDefs,
    resolvers
  });
};

export default getApiSchema;
