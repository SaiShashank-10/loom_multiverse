import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Accommodation, AccommodationDocument } from '../database/schemas/accommodation.schema';

@Injectable()
export class AccommodationService {
  constructor(
    @InjectModel(Accommodation.name) private readonly accommodationModel: Model<AccommodationDocument>,
  ) {}

  async create(accommodationData: Partial<Accommodation>): Promise<Accommodation> {
    const createdAccommodation = new this.accommodationModel(accommodationData);
    return await createdAccommodation.save();
  }

  async findAll(routePlanId: string): Promise<Accommodation[]> {
    return await this.accommodationModel.find({ route_plan_id: routePlanId }).exec();
  }
}