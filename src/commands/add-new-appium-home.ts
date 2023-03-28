import { Command } from './command';
import { AppiumEnvironmentService } from '../services/appium-environment';

export class AddNewAppiumHomeCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.environment.addNewHome';

  constructor(private appiumEnvironmentService: AppiumEnvironmentService) {
    super(AddNewAppiumHomeCommand.NAME);
  }

  public async excute() {
    await this.appiumEnvironmentService.createNewAppiumHome();
  }
}
