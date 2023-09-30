import { log } from "../utils/log.js";
import { packageManagerCommands } from "../utils/pkg.js";

function displayWelcomeMessage(selectedPackageManager, publishProject) {
	log.info("\n");
	log.info("==================================");
	log.info("=  PROJECT SUCCESSFULLY CREATED  =");
	log.info("==================================");
	log.info("\nYour project has been successfully initialized!\n");
	log.info("Here are some helpful tips to get you started:");
	log.info(`\n1. [Run the project]: ${packageManagerCommands[selectedPackageManager].dev}`);

	if (publishProject) {
		switch (publishProject) {
			case "Netlify":
				log.info(`2. [Open Netlify site]: netlify open`);
				break;
			case "Cloudflare Pages":
				log.info(
					`2. [Connect cloudflare pages to your repo]: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/`,
				);
				break;
			default:
				log.info(`2. [Deployment] For netlify or cloudflare pages deployment check:`);
				log.info(`	Netlify: https://docs.astro.build/en/guides/deploy/netlify`);
				log.info(`	Cloudflare pages: https://docs.astro.build/en/guides/deploy/cloudflare`);
		}
	} else {
		log.info(`2. [Deployment] For netlify or cloudflare pages deployment check:`);
		log.info(`	Netlify: https://docs.astro.build/en/guides/deploy/netlify`);
		log.info(`	Cloudflare pages: https://docs.astro.build/en/guides/deploy/cloudflare`);
	}

	log.info("3. [Astro docs]: https://docs.astro.build");
	log.info("4. [Template doc]: https://github.com/zankhq/astro-starter");
	log.info("\nHappy coding! 🚀\n");
	log.info("==================================");
	log.info("\n");
}

export { displayWelcomeMessage };
