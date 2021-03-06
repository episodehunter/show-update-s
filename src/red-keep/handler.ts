import { createGuard } from '@episodehunter/kingsguard';
import { TooManyEpisodes, NotFound } from '@episodehunter/thetvdb';
import { SNSEvent } from 'aws-lambda';
import { updateShow, addShow } from './update-show';
import { InsufficientShowInformation } from '../custom-erros';
import { config } from '../config';

const guard = createGuard(config.sentryDsn, config.logdnaKey);

export const update = guard<SNSEvent>((event, logger, context) => {
  const message = event.Records[0].Sns.Message;
  const theTvDbId = Number(message) | 0;

  logger.log(`Will update the show with theTvDbId: ${theTvDbId} and associated epesodes`);

  if (theTvDbId <= 0) {
    throw new Error('theTvDbId is not a valid id: ' + message);
  }

  return updateShow(theTvDbId, logger, context.awsRequestId).catch((error: Error) => {
    logger.log(error && error.message);
    if (error instanceof TooManyEpisodes || error instanceof InsufficientShowInformation) {
      return Promise.resolve('Error but OK: ' + error.message);
    }
    return Promise.reject(error);
  });
});

export const add = guard<{ theTvDbId: number }>(async (event, logger, context) => {
  const theTvDbId = event.theTvDbId | 0;

  logger.log(`Will add the show with theTvDbId: ${theTvDbId} and associated epesodes`);

  if (theTvDbId <= 0) {
    throw new Error('theTvDbId is not a valid id:' + event.theTvDbId);
  }

  try {
    return await addShow(theTvDbId, logger, context.awsRequestId);
  } catch (error) {
    if (error instanceof NotFound) {
      logger.warn(`Could not found show with id: ${theTvDbId} is it a movedb id?`);
      return {
        error: 'not-found'
      };
    }
    throw error;
  }
});
